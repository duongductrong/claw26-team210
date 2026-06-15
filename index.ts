import readline from "readline";
import dotenv from "dotenv";
import { runAgent, ChatMessage } from "./agent.js";

// Load configurations from .env
dotenv.config();

const agentName = process.env.AGENT_NAME || "JarvisTS";
const defaultSystemPrompt = `You are ${agentName}, a smart AI assistant built using TypeScript and @anthropic-ai/sdk.`;
const systemPrompt = process.env.SYSTEM_PROMPT || defaultSystemPrompt;

// Manage conversation state with a pure array (Functional state)
let memory: ChatMessage[] = [
  { role: "system", content: systemPrompt }
];

// Setup CLI interface (readline)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`====================================================`);
console.log(`🤖 Welcome to ${agentName} (TypeScript)!`);
console.log(`⚙️  Mode: 🟢 ONLINE (VNG Cloud AI Platform - qwen/qwen3-5-27b)`);
console.log(`⚙️  System Prompt: "${systemPrompt}"`);
console.log(`====================================================`);
console.log(`💡 Enter a message to talk to the Agent.`);
console.log(`💡 Type 'clear' to reset conversation memory, or 'exit' to quit.\n`);

// Interactive Agent Loop
const askQuestion = (): void => {
  rl.question("\n👤 User: ", async (input: string) => {
    const trimmedInput = input.trim();
    
    // Quit application on exit or quit
    if (trimmedInput.toLowerCase() === "exit" || trimmedInput.toLowerCase() === "quit") {
      console.log(`👋 Goodbye! Thank you for chatting with ${agentName}.`);
      rl.close();
      return;
    }

    if (trimmedInput === "") {
      askQuestion();
      return;
    }

    if (trimmedInput.toLowerCase() === "clear") {
      memory = [{ role: "system", content: systemPrompt }];
      console.log(`🤖 ${agentName}: Memory cleared. Let's start a new conversation!`);
      askQuestion();
      return;
    }

    try {
      // Update state with new User message (Immutable update pattern)
      const nextMemory = [...memory, { role: "user", content: trimmedInput } as ChatMessage];

      // Run Agent loop
      const { text, newMessages } = await runAgent(nextMemory);
      console.log(`🤖 ${agentName}: ${text}`);

      // Update conversation history
      memory = [...nextMemory, ...newMessages];
    } catch (error) {
      console.error("❌ An error occurred during execution:", (error as Error).message);
    }

    // Continue loop to prompt user for input
    askQuestion();
  });
};

// Start the loop
askQuestion();
