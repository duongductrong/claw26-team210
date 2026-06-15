import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "./types";
import { getEnv } from "../utils/env";

/**
 * Initializes the custom Anthropic client connected to VNG Cloud AI Platform (MaaS).
 */
export function getAgentClient(): Anthropic {
  const apiKey = getEnv("AI_PLATFORM_API_KEY");
  if (!apiKey || apiKey === "YOUR_AI_PLATFORM_API_KEY" || apiKey === "") {
    throw new Error("Invalid AI_PLATFORM_API_KEY configuration in .env file.");
  }
  
  // Clean up baseURL to ensure we don't end up with /v1/v1
  let baseURL = getEnv("AI_PLATFORM_BASE_URL", "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1");
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
