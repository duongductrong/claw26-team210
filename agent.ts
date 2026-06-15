import Anthropic from "@anthropic-ai/sdk";

// Define data structure for internal chat message
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * Initializes the custom Anthropic client connected to VNG Cloud AI Platform (MaaS).
 */
export function getAgentClient(): Anthropic {
  const apiKey = process.env.AI_PLATFORM_API_KEY;
  if (!apiKey || apiKey === "YOUR_AI_PLATFORM_API_KEY" || apiKey === "") {
    throw new Error("Invalid AI_PLATFORM_API_KEY configuration in .env file.");
  }
  
  // Clean up baseURL to ensure we don't end up with /v1/v1
  let baseURL = process.env.AI_PLATFORM_BASE_URL || "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1";
  if (baseURL.endsWith("/v1")) {
    baseURL = baseURL.substring(0, baseURL.length - 3);
  } else if (baseURL.endsWith("/v1/")) {
    baseURL = baseURL.substring(0, baseURL.length - 4);
  }

  return new Anthropic({
    baseURL,
    apiKey,
    defaultHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });
}

/**
 * Transforms internal chat history into Anthropic SDK format.
 */
export function transformToSDKMessages(messages: ChatMessage[]): {
  system?: string;
  sdkMessages: Anthropic.MessageParam[];
} {
  let system: string | undefined;
  const sdkMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system = msg.content;
    } else if (msg.role === "user") {
      sdkMessages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      sdkMessages.push({ role: "assistant", content: msg.content });
    } else if (msg.role === "tool") {
      sdkMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.toolCallId || "unknown",
            content: msg.content
          }
        ]
      });
    }
  }

  return { system, sdkMessages };
}

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: any) => Promise<any>;
}

const agentTools: ToolDefinition[] = [
  {
    name: "getSystemTime",
    description: "Gets the current system time.",
    input_schema: {
      type: "object",
      properties: {}
    },
    execute: async () => {
      const now = new Date().toLocaleString("en-US");
      return { time: now };
    }
  },
  {
    name: "getRandomNumber",
    description: "Generates a random number between min and max.",
    input_schema: {
      type: "object",
      properties: {
        min: { type: "number", description: "Minimum value" },
        max: { type: "number", description: "Maximum value" }
      },
      required: ["min", "max"]
    },
    execute: async ({ min, max }: { min: number; max: number }) => {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      return { number: num };
    }
  }
];

/**
 * Runs the Agent Loop: receives message history, calls the model, executes tools if requested,
 * and returns the final response text and new assistant messages.
 */
export async function runAgent(
  messages: ChatMessage[]
): Promise<{ text: string; newMessages: ChatMessage[] }> {
  const client = getAgentClient();
  const { system, sdkMessages } = transformToSDKMessages(messages);

  let currentMessages = [...sdkMessages];
  let finalResponseText = "";
  let steps = 0;
  const maxSteps = 5;

  while (steps < maxSteps) {
    const response = await client.messages.create({
      model: "qwen/qwen3-5-27b",
      system,
      messages: currentMessages,
      tools: agentTools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      })),
      max_tokens: 1024
    });

    const toolCalls = response.content.filter(
      block => block.type === "tool_use"
    ) as Anthropic.ToolUseBlock[];

    const textBlocks = response.content.filter(
      block => block.type === "text"
    ) as Anthropic.TextBlock[];
    const textResponse = textBlocks.map(b => b.text).join("\n");

    if (toolCalls.length === 0) {
      finalResponseText = textResponse;
      break;
    }

    if (textResponse) {
      finalResponseText += textResponse + "\n";
    }

    currentMessages.push({
      role: "assistant",
      content: response.content
    });

    const toolResultsContent: Anthropic.ToolResultBlockParam[] = [];

    for (const toolCall of toolCalls) {
      const tool = agentTools.find(t => t.name === toolCall.name);
      if (!tool) {
        toolResultsContent.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: `Error: Tool ${toolCall.name} not found.`,
          is_error: true
        });
        continue;
      }

      try {
        const result = await tool.execute(toolCall.input);
        toolResultsContent.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        });
      } catch (err) {
        toolResultsContent.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: `Error executing tool: ${(err as Error).message}`,
          is_error: true
        });
      }
    }

    currentMessages.push({
      role: "user",
      content: toolResultsContent
    });

    steps++;
  }

  if (steps >= maxSteps && !finalResponseText) {
    throw new Error("Agent exceeded maximum steps without returning a final response.");
  }

  return {
    text: finalResponseText.trim(),
    newMessages: [
      { role: "assistant", content: finalResponseText.trim() }
    ]
  };
}
