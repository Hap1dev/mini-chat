import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const histories = {};

app.use(bodyParser.json());

function saveMessage(tenant, message) {
    histories[tenant] = histories[tenant] || [];
    histories[tenant].push(message);
}

/* POST /send : client sends a message; Gateway calls Responder and streams reply via server-sent-events (SSE) */
app.post('/send', async (req, res) => {
    const tenant = req.headers['x-tenant-id'] || 'default';
    const {
        text
    } = req.body || {};
    if (!text) return res.status(400).json({
        error: 'text required'
    });

    // Save user message
    const msgId = Date.now().toString();
    saveMessage(tenant, {
        id: msgId,
        role: 'user',
        text
    });

    // Call Responder
    const responderRes = await axios.post(process.env.RESPONDER_URL, {
        workspace: tenant,
        text,
        slow: false
    });
    const data = responderRes.data;

    const fullReply = data.reply || '';

    // Save assistant message structure (will be updated by client as chunks arrive)
    saveMessage(tenant, {
        id: msgId + '-bot',
        role: 'assistant',
        text: '',
        metadata: {
            engine: data.engine
        }
    });

    // Respond with streaming URL and message id
    res.json({
        streamUrl: `/stream/${tenant}/${msgId}`,
        msgId
    });
});

/* SSE streaming endpoint: Gateway streams reply chunks to browser.
   Browser hits /stream/:tenant/:msgId immediately after /send response.
*/
app.get('/stream/:tenant/:msgId', async (req, res) => {
    const {
        tenant,
        msgId
    } = req.params;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });

    // Re-retrieve the last user message text (simple approach)
    const userMsg = (histories[tenant] || []).find(m => m.id === msgId);
    const userText = userMsg ? userMsg.text : '';

    // Ask Responder again (or you could pass a previously obtained reply). We'll call it to get reply.
    const r = await axios.post(
  process.env.RESPONDER_URL || 'http://localhost:4001/respond',
  { workspace: tenant, text: userText, slow: true }
);
const jr = r.data;


    const full = jr.reply || '...';

    // Chunking strategy: split by words into ~10-word chunks, send with small delay
    const words = full.split(/\s+/);
    let chunk = '';
    for (let i = 0; i < words.length; i++) {
        chunk += (i ? ' ' : '') + words[i];
        if ((i % 8) === 0 && i !== 0) {
            res.write(`data: ${chunk}\n\n`);
            // update in-memory assistant message
            const botMsg = (histories[tenant] || []).find(m => m.id === msgId + '-bot');
            if (botMsg) botMsg.text += (botMsg.text ? ' ' : '') + chunk;
            chunk = '';
            await new Promise(r => setTimeout(r, 200)); // small pause to simulate streaming
        }
    }
    if (chunk) {
        res.write(`data: ${chunk}\n\n`);
        const botMsg = (histories[tenant] || []).find(m => m.id === msgId + '-bot');
        if (botMsg) botMsg.text += (botMsg.text ? ' ' : '') + chunk;
    }

    res.write(`event: done\ndata: done\n\n`);
    res.end();
});

/* GET /history: returns per-tenant history */
app.get('/history', (req, res) => {
    const tenant = req.headers['x-tenant-id'] || 'default';
    res.json({
        history: histories[tenant] || []
    });
});

app.listen(PORT, () => {
    console.log(`Gateway running on' ${PORT}`)
});