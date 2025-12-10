# Multi-Tenant Chat Bot System with Streaming

This project is a multi-tenant chat bot system that demonstrates a microservices architecture with a gateway service, a responder service, and a React-based UI. It supports streaming responses from multiple chat engine providers and enforces workspace-based data isolation.

---

## 📁 Project Structure

```
├── service-a-gateway/   # Gateway service (Service A)
├── service-b-responder/ # Responder service (Service B)
└── ui/                  # React frontend (UI)
```

---

## 🚀 How to Run Everything Locally

### 1. Clone the repository
```bash
git clone https://github.com/Hap1dev/mini-chat.git
cd mini-chat
```

### 2. Set up environment variables
**For Service A (Gateway):**
```bash
PORT=3000
RESPONDER_URL=http://localhost:3001/respond
```
**For Service B (Responder):**
```bash
PORT=3001
ENGINE="echo"
OPENAI_API_KEY=your-openai-api-key
```

### 3. Run Service A (Gateway)
```bash
cd service-a-gateway
npm install
npm run dev  # runs on http://localhost:3000
```

### 4. Run Service B (Responder)
```bash
cd service-b-responder
npm install
npm run dev  # runs on http://localhost:3001
```

### 5. Run the UI
```bash
cd ui
npm install
npm run dev  # runs on http://localhost:5173
```

> **Note:** Make sure all services are running before using the UI.

---

## 🎥 Setup Video Guide

https://youtu.be/4sAEUdaFZGQ

---

## 🏗️ Architecture Overview

The system consists of three main components:

1. **UI (Frontend)**  
   - React app that allows users to send messages, select chat engine and select a tenant/workspace.
   - Communicates with the Gateway via REST and Server-Sent Events (SSE).

2. **Service A (Gateway)**  
   - Acts as an API gateway and stream coordinator.
   - Handles tenant isolation, message history, and streaming to the UI.
   - Forwards requests to Service B for response processing.

3. **Service B (Responder)**  
   - Provides an abstraction over multiple chat engines (Echo, Rule-based, GPT).
   - Returns generated responses (based on selected engine) to the Gateway.

**Communication Flow:**  
UI → Gateway → Responder → Gateway → UI (via streaming)

---

## 👥 Multi-Tenancy / Workspace Model

Multi-tenancy is implemented via HTTP headers and in-memory storage isolation:

- The UI sends an `X-Tenant-Id` header with each request.
- The Gateway uses this header to scope message history per tenant.
- Each tenant’s chat history is stored separately in memory (no cross-tenant data leakage).
- The tenant ID is passed to the Responder as a `workspace` parameter to allow future per-tenant model customization.

**Example header in UI request:**
```javascript
headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenant }
```

---

## 🤖 Chat Engine Abstraction

The Responder service uses a pluggable engine pattern:

- **BaseEngine** – abstract class with a `respond()` method.
- **Concrete engines**:
  - `EchoEngine`: Echoes user input in reverse order.
  - `RuleBasedEngine`: Returns predefined responses.
  - `GptEngine`: Real implementation that makes API calls to OpenAI GPT models using the API key.

**Provider selection:**  
The UI passes a `provider` parameter (echo, rule, gpt) which the Gateway forwards to the Responder. The Responder selects the corresponding engine instance.

---

## 📬 Message Model Extension

Each message in history follows this structure:

**User message:**
```json
{
  "id": "123456789",
  "role": "user",
  "text": "Hello"
}
```

**Bot message (extended with metadata):**
```json
{
  "id": "123456789-bot",
  "role": "assistant",
  "text": "Hi there!",
  "metadata": {
    "engine": "echo"
  }
}
```

**Backward compatibility:**  
Old clients that don’t expect `metadata` will simply ignore it, as it’s an additional field. The `role` and `text` fields remain unchanged, ensuring existing UI logic continues to work.

---

## 🌊 Streaming Logic

Streaming is implemented using Server-Sent Events (SSE):

1. UI sends a message to `/send` and receives a `streamUrl`.
2. UI opens an SSE connection to that URL.
3. Gateway:
   - Retrieves the user message.
   - Calls the Responder to get the full response.
   - Splits the response into word chunks and streams them to the UI via `res.write()`.
4. UI appends each chunk in real-time, simulating token-by-token AI output.

---

## ⚙️ Trade-Offs & Shortcuts

- **No database**: Used in-memory storage for simplicity; history is lost on restart.
- **Basic multi-tenancy**: Tenant isolation is via memory partitioning; not suitable for production security.
- **UI styling**: Minimalistic; focused on functionality over polish.

---

## 🔮 Next Steps (If More Time)

- Add persistent storage (PostgreSQL) for chat history.
- Implement authentication and proper tenant validation.
- Add unit and integration tests.
- Dockerize the services for easier deployment.
- Improve error handling and retry logic in streaming.

---

## 🎥 Demo

https://github.com/user-attachments/assets/81e7018e-7266-4e0c-a41f-b2a0eff93f57

---

## 📬 Contact

For questions or feedback, feel free to reach out.

---

**Built as part of a technical assignment.**
