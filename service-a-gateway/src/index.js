import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const histories = {};

app.use(cors());
app.use(bodyParser.json());

function saveMessage(tenant, message) {
    histories[tenant] = histories[tenant] || [];
    histories[tenant].push(message);
}

/* POST /send: client sends a message; Gateway calls Responder and streams reply via server-sent-events (SSE) */
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
    const responderRes = await axios.post(process.env.RESPONDER_URL, {
        workspace: tenant,
        text,
        provider: req.body.provider,
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

    // Re-retrieve the last user message text
    const userMsg = (histories[tenant] || []).find(m => m.id === msgId);
    const userText = userMsg ? userMsg.text : '';

    // Ask Responder again
    const r = await axios.post(process.env.RESPONDER_URL, {
        workspace: tenant,
        text: userText,
        provider: req.query.provider || "echo",
        slow: true
    });

    const jr = r.data;
    const full = jr.reply || '...';

    // Initialize or find bot message
    let botMsg = (histories[tenant] || []).find(m => m.id === msgId + '-bot');

    // If bot message doesn't exist, create it
    if (!botMsg) {
        botMsg = {
            id: msgId + '-bot',
            role: 'assistant',
            text: ''
        };
        if (!histories[tenant]) histories[tenant] = [];
        histories[tenant].push(botMsg);
    }

    const words = full.split(/\s+/);
    const chunkSize = 5;

    for (let i = 0; i < words.length; i += chunkSize) {
        const chunkWords = words.slice(i, i + chunkSize);
        const chunk = chunkWords.join(' ');

        if (chunk) {
            res.write(`data: ${chunk}\n\n`);
            botMsg.text += (botMsg.text && !botMsg.text.endsWith(' ') ? ' ' : '') + chunk;
            await new Promise(r => setTimeout(r, 150));
        }
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