import readline from "readline";
import { runAgent } from "../core/agent";
import { SessionManager } from "../core/session";
import { getEnv } from "../utils/env";

export class CommandLineInterface {
  private rl: readline.Interface;
  private sessionManager = SessionManager.getInstance();
  private sessionId = "cli";
  private agentName = getEnv("AGENT_NAME", "JarvisTS");

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Starts the CLI interactive loop.
   */
  public start(): void {
    const systemPrompt = getEnv("SYSTEM_PROMPT", `You are ${this.agentName}, a smart AI assistant.`);

    console.log(`====================================================`);
    console.log(`🤖 Welcome to ${this.agentName} (TypeScript CLI)!`);
    console.log(`⚙️  Mode: 🟢 ONLINE (VNG Cloud AI Platform - qwen/qwen3-5-27b)`);
    console.log(`⚙️  System Prompt: "${systemPrompt}"`);
    console.log(`====================================================`);
    console.log(`💡 Enter a message to talk to the Agent.`);
    console.log(`💡 Type 'clear' to reset conversation memory, or 'exit' to quit.\n`);

    this.askQuestion();
  }

  /**
   * Prompts the user and processes their input.
   */
  private askQuestion(): void {
    this.rl.question("\n👤 User: ", async (input: string) => {
      const trimmedInput = input.trim();

      // Check for exit
      if (
        trimmedInput.toLowerCase() === "exit" ||
        trimmedInput.toLowerCase() === "quit"
      ) {
        console.log(`👋 Goodbye! Thank you for chatting with ${this.agentName}.`);
        this.rl.close();
        return;
      }

      // Skip empty inputs
      if (trimmedInput === "") {
        this.askQuestion();
        return;
      }

      // Check for memory clear
      if (trimmedInput.toLowerCase() === "clear") {
        this.sessionManager.clearSession(this.sessionId);
        console.log(`🤖 ${this.agentName}: Memory cleared. Let's start a new conversation!`);
        this.askQuestion();
        return;
      }

      try {
        const history = this.sessionManager.getSession(this.sessionId);
        const nextHistory = [...history, { role: "user", content: trimmedInput } as any];

        // Call agent runner
        const { text, newMessages } = await runAgent(nextHistory);
        console.log(`🤖 ${this.agentName}: ${text}`);

        // Save session history
        this.sessionManager.updateSession(this.sessionId, [...nextHistory, ...newMessages]);
      } catch (error) {
        console.error("❌ An error occurred during execution:", (error as Error).message);
      }

      // Continue the interactive loop
      this.askQuestion();
    });
  }
}
