import { Skill, ToolDefinition } from "../../core/types";

export const getSystemTime: ToolDefinition = {
  name: "getSystemTime",
  description: "Gets the current system time.",
  input_schema: {
    type: "object",
    properties: {},
  },
  execute: async () => {
    const now = new Date().toLocaleString("en-US");
    return { time: now };
  },
};

export const systemSkill: Skill = {
  id: "system",
  name: "System Utility Skill",
  description: "Provides basic system tools such as getting current time and checking status.",
  systemPromptAdditions: "Use the getSystemTime tool whenever the user asks for the current time or date.",
  tools: [getSystemTime],
};
