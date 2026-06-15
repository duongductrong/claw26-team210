import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { runAgent } from "./core/agent";
import { ChatMessage } from "./core/types";
import { ZaloService } from "./services/zalo";

// Load configurations from .env
dotenv.config();

const app = express();
const port = process.env.GREENNODE_AGENT_IDENTITY ? 8080 : (process.env.PORT || 3000);

// Use Express JSON middleware to parse incoming request bodies
app.use(express.json());

// Initialize Zalo Bot if configured
const zaloService = new ZaloService();
zaloService.init(app);

const agentName = process.env.AGENT_NAME || "JarvisTS";
const defaultSystemPrompt = `You are ${agentName}, a smart AI assistant built using TypeScript and @anthropic-ai/sdk.`;
const systemPrompt = process.env.SYSTEM_PROMPT || defaultSystemPrompt;

// Global conversation memory
let memory: ChatMessage[] = [
  { role: "system", content: systemPrompt }
];

// 1. Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    agent: agentName,
    mode: "vng-cloud",
    timestamp: new Date().toISOString()
  });
});

// 2. Chat communication endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Valid string 'message' field is required in request body."
    });
  }

  try {
    const nextMemory = [...memory, { role: "user", content: message.trim() } as ChatMessage];
    
    // Call agent runner
    const { text, newMessages } = await runAgent(nextMemory);
    
    memory = [...nextMemory, ...newMessages];

    // Return agent response and full conversation history
    res.json({
      success: true,
      agent: agentName,
      response: text,
      history: memory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Internal processing error: ${(error as Error).message}`
    });
  }
});

// 3. Retrieve current conversation history endpoint
app.get("/api/history", (req: Request, res: Response) => {
  res.json({
    agent: agentName,
    history: memory
  });
});

// 4. Reset agent memory endpoint
app.post("/api/clear", (req: Request, res: Response) => {
  memory = [
    { role: "system", content: systemPrompt }
  ];
  res.json({
    success: true,
    message: `Successfully reset conversation memory for ${agentName}.`
  });
});

// Start server
app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🚀 TypeScript Agent Web Server running successfully!`);
  console.log(`🔗 Address: http://localhost:${port}`);
  console.log(`⚙️  Mode: 🟢 ONLINE (VNG Cloud AI Platform - qwen/qwen3-5-27b)`);
  console.log(`👉 GET  http://localhost:${port}/health (Health Check)`);
  console.log(`👉 POST http://localhost:${port}/api/chat (Chat Endpoint)`);
  console.log(`====================================================`);
});
