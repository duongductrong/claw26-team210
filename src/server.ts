import dotenv from "dotenv";
import { initSkills } from "./skills";
import { ZaloService } from "./services/zalo";
import { getEnv } from "./utils/env";
import { createApp } from "./server/app";

// Load configurations from .env
dotenv.config();

// Initialize skills registry
initSkills();

const app = createApp();
const port = getEnv("GREENNODE_AGENT_IDENTITY") ? 8080 : (Number(getEnv("PORT")) || 3000);
const agentName = getEnv("AGENT_NAME", "JarvisTS");

// Initialize Zalo Bot service if configured
const zaloService = new ZaloService();
zaloService.init(app);

// Start HTTP server
app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🚀 TypeScript Agent Web Server running successfully!`);
  console.log(`🔗 Address: http://localhost:${port}`);
  console.log(`⚙️  Mode: 🟢 ONLINE (VNG Cloud AI Platform - qwen/qwen3-5-27b)`);
  console.log(`👉 GET  http://localhost:${port}/health (Health Check)`);
  console.log(`👉 POST http://localhost:${port}/api/chat (Chat Endpoint)`);
  console.log(`====================================================`);
});
