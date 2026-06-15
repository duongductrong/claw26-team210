# 🤖 Basic AI Agent Template in TypeScript & @anthropic-ai/sdk

This project is a minimalist AI Agent template written in **TypeScript** and **@anthropic-ai/sdk**, integrated with the **VNG Cloud MaaS AI Platform** (`qwen/qwen3-5-27b` model). It is designed to show the core concepts of agent development using a clean, functional programming style.

---

## 🌟 Why @anthropic-ai/sdk & TypeScript?

1. **Type Safety**: TypeScript ensures type-safe configurations for agent inputs, system messages, and tool parameters.
2. **Declarative Tools**: Define tools naturally using structured JSON schemas and async execution functions.
3. **Custom Tool Loop**: Clear and explicit multi-step tool execution loop, giving you full control over how model decisions are handled.
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

All source files are now organized under the `src/` directory to separate concerns:
- [`src/core/`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/core/): Core agent loop (`agent.ts`), initialization (`client.ts`), and interfaces (`types.ts`).
- [`src/services/`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/services/): External service integrations (`atlassian.ts` for Jira/Confluence REST APIs).
- [`src/tools/`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/tools/): Tool definitions grouped by domain (`system.ts`, `jira.ts`, `confluence.ts`) and aggregated in `index.ts`.
- [`src/index.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/index.ts): Interactive command-line (CLI) terminal interface.
- [`src/server.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/server.ts): Express API server.
- [`src/scratch_test.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/scratch_test.ts): Custom unit testing suite.
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

1. Create your tool definition in a domain-specific file under [`src/tools/`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/tools/) (e.g., `src/tools/weather.ts`):
```typescript
import { ToolDefinition } from "../core/types";

export const getWeather: ToolDefinition = {
  name: "getWeather",
  description: "Get the current weather conditions for a location.",
  input_schema: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name, e.g. Tokyo" }
    },
    required: ["location"]
  },
  execute: async ({ location }) => {
    // Implement real API call or mock data return
    return { location, condition: "Sunny", temperature: "25°C" };
  }
};
```

2. Register the tool in [`src/tools/index.ts`](file:///Users/duongductrong/Developer/zlp/claw26-team210/src/tools/index.ts) by importing it and adding it to the `agentTools` array:
```typescript
import { getWeather } from "./weather";

export const agentTools: ToolDefinition[] = [
  // ... existing tools
  getWeather
];
```
