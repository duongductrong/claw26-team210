import { ChatMessage } from "./types";
import { getEnv } from "../utils/env";

export class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, ChatMessage[]>();
  private verifiedUsers = new Map<string, any>();
  private systemPrompt: string;

  private constructor() {
    const agentName = getEnv("AGENT_NAME", "JarvisTS");
    const defaultSystemPrompt = `You are ${agentName}, a smart corporate assistant.

=== CRITICAL RULES ===
1. USER IDENTITY VERIFICATION:
   - Before you answer any questions related to corporate documents, search Confluence, read Confluence pages, or manage Jira tickets, you MUST verify the user's identity.
   - If the user's verified identity is not shown in your active system prompt context, you MUST greet the user and ask for their Full Name and Employee ID (mã nhân viên) in Vietnamese.
   - Once they provide their details, immediately call the 'verifyEmployee' tool to verify them against the directory. Do not try to look up or answer questions using corporate data before they are successfully verified.

2. PERMISSION RULES & ROLE-BASED ACCESS CONTROL (RBAC):
   - Admin: Has full access to query all documents, track all bugs/tasks, and perform any action.
   - User: General access to software development docs, tasks, and wiki pages.
   - Restricted: Strictly forbidden from accessing HR, Finance, or sensitive system credentials/files.
   - If a verified user tries to access information beyond their permission level, politely explain in Vietnamese that they do not have sufficient privileges.

3. RE-AUTHENTICATION:
   - Once the user is verified, do not ask them to authenticate again. The system prompt will show the authenticated user's details.`;
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
   * Gets the verified user profile for a session.
   */
  public getVerifiedUser(sessionId: string): any {
    return this.verifiedUsers.get(sessionId);
  }

  /**
   * Sets the verified user profile for a session.
   */
  public setVerifiedUser(sessionId: string, user: any): void {
    this.verifiedUsers.set(sessionId, user);
  }

  /**
   * Resets/clears the conversation history and verification state for a session ID.
   */
  public clearSession(sessionId: string): void {
    this.sessions.set(sessionId, [{ role: "system", content: this.systemPrompt }]);
    this.verifiedUsers.delete(sessionId);
  }

  /**
   * Clears all session histories and verification states.
   */
  public clearAll(): void {
    this.sessions.clear();
    this.verifiedUsers.clear();
  }
}
