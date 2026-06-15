import { Skill, ToolDefinition } from "../../core/types";
import { AgentMemoryService } from "../../services/memory";
import { SessionManager } from "../../core/session";

export const saveUserPreference: ToolDefinition = {
  name: "saveUserPreference",
  description: "Saves a preference, habit, or fact about the current verified user to long-term memory.",
  input_schema: {
    type: "object",
    properties: {
      fact: { type: "string", description: "The fact or preference to save, e.g. 'Prefers dark mode' or 'Drinks black coffee'" }
    },
    required: ["fact"]
  },
  execute: async ({ fact }: { fact: string }, context) => {
    if (!context?.sessionId) {
      throw new Error("Access Denied: Session ID is required to access memory.");
    }
    const verifiedUser = SessionManager.getInstance().getVerifiedUser(context.sessionId);
    if (!verifiedUser) {
      throw new Error("Access Denied: Please verify your identity first by providing your Name and Employee ID.");
    }

    const memoryService = AgentMemoryService.getInstance();
    return await memoryService.saveFact(verifiedUser.id, fact);
  }
};

export const getUserPreferences: ToolDefinition = {
  name: "getUserPreferences",
  description: "Retrieves stored preferences, habits, or facts about the current verified user.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional keyword search query to filter preferences" }
    }
  },
  execute: async ({ query }: { query?: string }, context) => {
    if (!context?.sessionId) {
      throw new Error("Access Denied: Session ID is required to access memory.");
    }
    const verifiedUser = SessionManager.getInstance().getVerifiedUser(context.sessionId);
    if (!verifiedUser) {
      throw new Error("Access Denied: Please verify your identity first by providing your Name and Employee ID.");
    }

    const memoryService = AgentMemoryService.getInstance();
    const facts = await memoryService.queryFacts(verifiedUser.id, query || "");
    return {
      userId: verifiedUser.id,
      userName: verifiedUser.name,
      preferences: facts
    };
  }
};

export const memorySkill: Skill = {
  id: "memory",
  name: "Agent Memory Skill",
  description: "Enables long-term fact storage and preference recall for verified users.",
  systemPromptAdditions: `You can use memory tools to store and retrieve personal details, habits, and preferences for the currently authenticated user.
- Use saveUserPreference to save facts, like their favorite programming language, coffee choices, or settings.
- Use getUserPreferences to check for saved facts to personalize your answers.`,
  tools: [saveUserPreference, getUserPreferences]
};
