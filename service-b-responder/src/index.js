import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const DEFAULT = process.env.ENGINE;

app.use(cors());
app.use(bodyParser.json());

class BaseEngine{
	async respond({ workspace, text }){
		return "not implemented";
	}
};

class EchoEngine extends BaseEngine {
  async respond({ workspace, text }) {
    return `Echo (${workspace}): ${text.split('').reverse().join('')}`;
  }
};

class RuleBasedEngine extends BaseEngine {
  async respond({ workspace, text }) {
    const t = text.toLowerCase();
    if (t.includes("hello") || t.includes("hi")) return "Hi, how can I help?";
    if (t.includes("price")) return "Prices are dynamic; which product?";
    return "I'm a simple bot. Try 'hello' or ask about 'price'.";
  }
};

const engines = {
	echo: new EchoEngine(),
	rule: new RuleBasedEngine()
};

app.post("/respond", async (req, res) => {
	const workspace = (req.body.workspace !== undefined) ? req.body.workspace : "default";
	const text = (req.body.text !== undefined) ? req.body.text : "";
	const slow = (req.body.slow !== undefined) ? req.body.slow : false;
	const engineName = (req.body.provider !== undefined) ? req.body.provider : DEFAULT;
  const engine = engines[engineName] || engines[DEFAULT];
  let response = await engine.respond({ workspace, text });
  if (slow) response = response + " ".repeat(20);
 	res.json({ reply: response, engine: engineName });
});

app.listen(PORT, () => {
	console.log(`Responder running on ${PORT}, engine=${DEFAULT}`);
});