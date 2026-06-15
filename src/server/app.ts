import express, { Express } from "express";
import { createRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  // Middleware to parse incoming JSON bodies
  app.use(express.json());

  // Register routing endpoints
  app.use(createRouter());

  return app;
}
