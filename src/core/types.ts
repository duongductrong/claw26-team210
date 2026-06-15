// Define data structures for internal chat messages and tools
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: any) => Promise<any>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  systemPromptAdditions?: string;
  tools: ToolDefinition[];
}

export interface Artifact {
  id: string;
  title: string;
  type: "code" | "markdown" | "json" | "text" | string;
  content: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

