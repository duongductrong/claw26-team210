# 🤖 Basic AI Agent Template in TypeScript & Vercel AI SDK

This project is a minimalist AI Agent template written in **TypeScript** and **Vercel AI SDK**, integrated with the **VNG Cloud MaaS AI Platform** (`google/gemma-4-31b-it` model). It is designed to show the core concepts of agent development using a clean, functional programming style.

---

## 🌟 Why Vercel AI SDK & TypeScript?

1. **Type Safety**: TypeScript ensures type-safe configurations for agent inputs, system messages, and tool parameter schemas (via **Zod**).
2. **Declarative Tools**: Define tools naturally using Zod schemas and async execution functions.
3. **Automatic Tool Loop**: The SDK automatically handles multi-step tool execution based on model decisions, removing boilerplate loop code.
4. **Functional Programming**: Decoupled, pure functions for model calling and message transforming, avoiding mutable class states.

---

## ⚙️ Core Implemented Concepts

1. **System Prompt**: Defines the persona and behavior rules of the AI agent.
2. **Functional State**: Plain arrays of `ChatMessage` representing chat history, passed immutably.
3. **Tools**: Defined functions that the AI can choose to execute:
   - `getSystemTime`: Retrieves the current system time.
   - `getRandomNumber`: Generates a random integer in a given range.

---

## 📁 Project Structure

- [`agent.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/agent.ts): Pure functional core logic using Vercel AI SDK. Initializes custom VNG Cloud OpenAI provider.
- [`index.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/index.ts): Interactive command-line (CLI) terminal interface.
- [`server.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/server.ts): Express API server providing endpoints to integrate the agent.
- [`tsconfig.json`](file:///Users/duongductrong/Developer/zlp/claw26-team210/tsconfig.json): TypeScript compilation config.
- [`package.json`](file:///Users/duongductrong/Developer/zlp/claw26-team210/package.json): Script configurations and dependencies.

---

## 🚀 Setup & Execution

### 1. Install Dependencies
Run the install command in your terminal:
```bash
npm install
```

### 2. Configure Environment Keys
Create a `.env` file from the example and fill in your VNG Cloud AI Platform API key:
```env
AI_PLATFORM_API_KEY="your_api_key_here"
AI_PLATFORM_BASE_URL="https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1"
```
*Note: Valid keys are required to execute calls successfully.*

### 3. Run in CLI Terminal Mode
Start the interactive chat interface in your terminal:
```bash
npm start
```

### 4. Run as API Web Server
Start the Express API server:
```bash
npm run server
```
The server runs on `http://localhost:3000`. You can interact with:
- `GET http://localhost:3000/health`: System health check.
- `POST http://localhost:3000/api/chat` (Body: `{ "message": "your query" }`): Interact with the agent.

### 5. Run Automated Tests
Execute types verification and unit tests:
```bash
npm test
```

---

## 💡 How to Add Custom Tools

Add new tools to the `tools` property inside `runAgent()` in [`agent.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/agent.ts):

```typescript
import { tool } from "ai";
import { z } from "zod";

// Inside the tools object:
getWeather: tool({
  description: "Get the current weather conditions for a location.",
  inputSchema: z.object({
    location: z.string().describe("City name, e.g. Tokyo")
  }),
  execute: async ({ location }) => {
    // Implement real API call or mock data return
    return { location, condition: "Sunny", temperature: "25°C" };
  }
})
```
