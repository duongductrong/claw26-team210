import { ToolDefinition } from "../core/types";

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
