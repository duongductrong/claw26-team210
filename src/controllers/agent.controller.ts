import { Request, Response } from "express";
import { runAgent } from "../core/agent";
import { SessionManager } from "../core/session";
import { getEnv } from "../utils/env";

export class AgentController {
  private sessionManager = SessionManager.getInstance();
  private agentName = getEnv("AGENT_NAME", "JarvisTS");

  /**
   * Health Check Handler
   */
  public healthCheck = (req: Request, res: Response): void => {
    res.json({
      status: "ok",
      agent: this.agentName,
      mode: "vng-cloud",
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Send Message & Process Agent Loop
   */
  public chat = async (req: Request, res: Response): Promise<Response | void> => {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Valid string 'message' field is required in request body."
      });
    }

    try {
      const sessionId = (req.body.sessionId || req.headers["x-session-id"] || "global") as string;
      const history = this.sessionManager.getSession(sessionId);
      
      const nextHistory = [...history, { role: "user", content: message.trim() } as any];
      
      const { text, newMessages } = await runAgent(nextHistory, sessionId);
      
      this.sessionManager.updateSession(sessionId, [...nextHistory, ...newMessages]);

      res.json({
        success: true,
        agent: this.agentName,
        response: text,
        history: this.sessionManager.getSession(sessionId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Internal processing error: ${(error as Error).message}`
      });
    }
  };

  /**
   * Retrieve Current Chat History
   */
  public getHistory = (req: Request, res: Response): void => {
    const sessionId = (req.query.sessionId || req.headers["x-session-id"] || "global") as string;
    res.json({
      agent: this.agentName,
      history: this.sessionManager.getSession(sessionId)
    });
  };

  /**
   * Reset Agent Conversation Memory
   */
  public clearMemory = (req: Request, res: Response): void => {
    const sessionId = (req.body.sessionId || req.headers["x-session-id"] || "global") as string;
    this.sessionManager.clearSession(sessionId);
    res.json({
      success: true,
      message: `Successfully reset conversation memory for ${this.agentName}.`
    });
  };
}
