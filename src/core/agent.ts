import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "./types";
import { getAgentClient, transformToSDKMessages } from "./client";
import { SkillsRegistry } from "./registry";

/**
 * Runs the Agent Loop: receives message history, calls the model, executes tools if requested,
 * and returns the final response text and new assistant messages.
 */
export async function runAgent(
  messages: ChatMessage[]
): Promise<{ text: string; newMessages: ChatMessage[] }> {
  const client = getAgentClient();
  const { system, sdkMessages } = transformToSDKMessages(messages);

  const registry = SkillsRegistry.getInstance();
  const activeTools = registry.getActiveTools();
  const additions = registry.getSystemPromptAdditions();
  const combinedSystem = (system || "") + (additions ? "\n\n" + additions : "");

  let currentMessages = [...sdkMessages];
  let finalResponseText = "";
  let steps = 0;
  const maxSteps = 5;

  while (steps < maxSteps) {
    const response = await client.messages.create({
      model: "qwen/qwen3-5-27b",
      system: combinedSystem || undefined,
      messages: currentMessages,
      tools: activeTools.map(t => ({
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
      const tool = activeTools.find(t => t.name === toolCall.name);
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

