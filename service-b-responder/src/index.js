import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const DEFAULT = process.env.ENGINE;
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(bodyParser.json());

class BaseEngine {
    async respond({
        workspace,
        text
    }) {
        return "not implemented";
    }
};

class EchoEngine extends BaseEngine {
    async respond({
        workspace,
        text
    }) {
        return `${workspace} (echo): ${text.split('').reverse().join('')}`;
    }
};

class RuleBasedEngine extends BaseEngine {
    async respond({
        workspace,
        text
    }) {
        const t = text.toLowerCase();
        if (t.includes("hello") || t.includes("hi")) return `${workspace} (rule-based): Hi, how can I help?`;
        if (t.includes("price")) return `${workspace} (rule-based): Prices are dynamic; which product?`;
        return `${workspace} (rule-based): I'm a simple bot. Try 'hello' or ask about 'price'.`;
    }
};

class GptEngine extends BaseEngine {
    async respond({
        workspace,
        text
    }) {
        try {
            const chatCompletion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                        role: "system",
                        content: `You are a helpful assistant for workspace ${workspace}.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.7
            });
            return `${workspace} (gpt-4o-mini): ${chatCompletion.choices[0].message.content}`;
        } catch (err) {
            console.error("GPT Engine Error:", err);
            return "Error: GPT Engine failed to respond.";
        }
    }
}

const engines = {
    echo: new EchoEngine(),
    rule: new RuleBasedEngine(),
    gpt: new GptEngine()
};

app.post("/respond", async (req, res) => {
    const workspace = (req.body.workspace !== undefined) ? req.body.workspace : "default";
    const text = (req.body.text !== undefined) ? req.body.text : "";
    const slow = (req.body.slow !== undefined) ? req.body.slow : false;
    const engineName = (req.body.provider !== undefined) ? req.body.provider : DEFAULT;
    const engine = engines[engineName] || engines[DEFAULT];
    let response = await engine.respond({
        workspace,
        text
    });
    if (slow) response = response + " ".repeat(20);
    res.json({
        reply: response,
        engine: engineName
    });
});

app.listen(PORT, () => {
    console.log(`Responder running on ${PORT}`);
});