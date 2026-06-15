import { ChatMessage } from "./types";
import { getEnv } from "../utils/env";

export class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, ChatMessage[]>();
  private systemPrompt: string;

  private constructor() {
    const agentName = getEnv("AGENT_NAME", "JarvisTS");
    const defaultSystemPrompt = `You are ${agentName}, a smart AI assistant built using TypeScript and @anthropic-ai/sdk.`;
    this.systemPrompt = getEnv("SYSTEM_PROMPT", defaultSystemPrompt);
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Retrieves conversation history for a session ID.
   * If it doesn't exist, initializes it with the system prompt.
   */
  public getSession(sessionId: string): ChatMessage[] {
    let history = this.sessions.get(sessionId);
    if (!history) {
      history = [{ role: "system", content: this.systemPrompt }];
      this.sessions.set(sessionId, history);
    }
    return history;
  }

  /**
   * Updates conversation history for a session ID.
   */
  public updateSession(sessionId: string, nextHistory: ChatMessage[]): void {
    this.sessions.set(sessionId, nextHistory);
  }

  /**
   * Resets/clears the conversation history for a session ID.
   */
  public clearSession(sessionId: string): void {
    this.sessions.set(sessionId, [{ role: "system", content: this.systemPrompt }]);
  }

  /**
   * Clears all session histories (useful for tests).
   */
  public clearAll(): void {
    this.sessions.clear();
  }
}
