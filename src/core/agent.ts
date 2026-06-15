import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "./types";
import { getAgentClient, transformToSDKMessages } from "./client";
import { SkillsRegistry } from "./registry";
import { SessionManager } from "./session";

/**
 * Runs the Agent Loop: receives message history, calls the model, executes tools if requested,
 * and returns the final response text and new assistant messages.
 */
export async function runAgent(
  messages: ChatMessage[],
  sessionId?: string
): Promise<{ text: string; newMessages: ChatMessage[] }> {
  const client = getAgentClient();
  const { system, sdkMessages } = transformToSDKMessages(messages);

  const registry = SkillsRegistry.getInstance();
  const activeTools = registry.getActiveTools();
  const additions = registry.getSystemPromptAdditions();
  
  let userAddition = "";
  let securityAddition = "";
  if (sessionId) {
    const verifiedUser = SessionManager.getInstance().getVerifiedUser(sessionId);
    if (verifiedUser) {
      userAddition = `\n\n[AUTHENTICATED USER INFO]\nYou are interacting with verified user: ${verifiedUser.name} (ID: ${verifiedUser.id}).\nDepartment: ${verifiedUser.department}\nRole: ${verifiedUser.role}\nAccess Level: ${verifiedUser.accessLevel}\nDo not ask them to authenticate again. Use their name and respect their access level.`;
    } else {
      securityAddition = `\n\n[SECURITY REQUIREMENT - USER IDENTITY VERIFICATION]\nBefore assisting the user with any corporate data queries (such as Confluence searches, reading pages, or Jira tracking), you MUST verify the user's identity.\n- If you do not have the user's verified identity, you MUST greet the user and ask for their Full Name and Employee ID (mã nhân viên) in Vietnamese.\n- Once they provide their details, immediately call the 'verifyEmployee' tool to verify them against the directory (Page ID: 131319). Do not try to look up or answer questions using corporate data before they are successfully verified.`;
    }
  }

  const combinedSystem = (system || "") + (additions ? "\n\n" + additions : "") + userAddition + securityAddition;

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
        const result = await tool.execute(toolCall.input, { sessionId });
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

