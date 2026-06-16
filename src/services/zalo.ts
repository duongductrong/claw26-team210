import ZaloBot, { ZaloMessage, ZaloUpdate } from "node-zalo-bot";
import { Express } from "express";
import { runAgent } from "../core/agent";
import { ChatMessage } from "../core/types";
import { SessionManager } from "../core/session";
import { formatMarkdownToPlainText, splitMessage } from "../utils/formatter";
import { getEnv } from "../utils/env";

export class ZaloService {
  private bot: ZaloBot | null = null;
  private sessionManager = SessionManager.getInstance();

  constructor() {}

  /**
   * Initializes the Zalo bot. Can be set up to use Polling or Webhook.
   */
  public init(app?: Express): void {
    const token = getEnv("ZALO_BOT_TOKEN");
    if (!token) {
      console.warn("⚠️ ZALO_BOT_TOKEN is not configured. Zalo Bot will not start.");
      return;
    }

    const isRunningOnPlatform = !!getEnv("GREENNODE_AGENT_IDENTITY");
    const usePolling = isRunningOnPlatform ? false : (getEnv("ZALO_BOT_POLLING") === "true");

    console.log(`🔌 Initializing Zalo Bot (Polling: ${usePolling}, Platform: ${isRunningOnPlatform})...`);

    this.bot = new ZaloBot(token, {
      polling: usePolling,
    });

    this.setupListeners();

    if (!usePolling && app) {
      this.setupWebhookRoute(app);
    }
  }

  /**
   * Registers event handlers for incoming Zalo messages.
   */
  private setupListeners(): void {
    if (!this.bot) return;

    this.bot.on("message", async (msg: ZaloMessage) => {
      const chatId = msg.chat.id;
      const text = msg.text?.trim();

      if (!text) return;

      console.log(`💬 Zalo msg from ${chatId}: "${text}"`);

      // Handle 'clear' command to reset session memory
      if (text.toLowerCase() === "clear") {
        this.sessionManager.clearSession(chatId);
        await this.bot?.sendMessage(chatId, "Memory cleared. Let's start a new conversation!");
        return;
      }

      // 1. Get or initialize session conversation history
      const userHistory = this.sessionManager.getSession(chatId);

      // 2. Append new user message
      const nextHistory = [
        ...userHistory,
        { role: "user", content: text } as ChatMessage,
      ];

      try {
        // 3. Send typing indicator status
        await this.bot?.sendChatAction(chatId, "typing");

        // 4. Run Agent loop
        const { text: replyText, newMessages } = await runAgent(nextHistory, chatId);

        // 5. Reply to user on Zalo in chunks if it exceeds Zalo limit
        const formattedReply = formatMarkdownToPlainText(replyText);
        const chunks = splitMessage(formattedReply);
        for (const chunk of chunks) {
          await this.bot?.sendMessage(chatId, chunk);
          // Small delay to ensure correct order
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 6. Save updated history
        this.sessionManager.updateSession(chatId, [...nextHistory, ...newMessages]);
      } catch (error) {
        console.error(`❌ Zalo agent error for chat ${chatId}:`, error);
        await this.bot?.sendMessage(
          chatId,
          "Sorry, I encountered an error while processing your request."
        );
      }
    });
  }

  /**
   * Webhook route for receiving updates pushed from Zalo servers.
   */
  private setupWebhookRoute(app: Express): void {
    const secretToken = getEnv("ZALO_WEBHOOK_SECRET_TOKEN");
    const webhookUrl = getEnv("ZALO_WEBHOOK_URL");

    app.post("/webhook/zalo", (req, res) => {
      if (secretToken && req.headers["x-bot-api-secret-token"] !== secretToken) {
        console.warn("🔒 Unauthorized webhook request received on Zalo endpoint");
        return res.status(403).json({ error: "Unauthorized" });
      }

      const update = req.body as ZaloUpdate;
      if (this.bot && update) {
        this.bot.processUpdate(update);
      }
      res.sendStatus(200);
    });

    // Automatically register webhook URL with Zalo if provided
    if (webhookUrl) {
      this.bot?.setWebHook(webhookUrl, {
        secret_token: secretToken,
      })
        .then(() => console.log(`🚀 Registered Zalo Webhook at: ${webhookUrl}`))
        .catch(err => console.error("❌ Failed to set Zalo Webhook:", err));
    }
  }
}
