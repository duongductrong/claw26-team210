import { Router } from "express";
import { AgentController } from "../controllers/agent.controller";

export function createRouter(): Router {
  const router = Router();
  const controller = new AgentController();

  router.get("/health", controller.healthCheck);
  router.post("/api/chat", controller.chat);
  router.get("/api/history", controller.getHistory);
  router.post("/api/clear", controller.clearMemory);

  return router;
}
