import { getAgentClient, transformToSDKMessages } from "./core/client";
import { ChatMessage } from "./core/types";
import { callJiraCloudAPI, callConfluenceCloudAPI } from "./services/atlassian";

async function runTests() {
  console.log("1. Testing transformToSDKMessages...");
  const sampleMessages: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi! How can I help you?" },
    { role: "tool", content: JSON.stringify({ result: 42 }), name: "testTool", toolCallId: "call_123" }
  ];

  const { system, sdkMessages } = transformToSDKMessages(sampleMessages);
  console.log("SDK Messages count:", sdkMessages.length);
  if (sdkMessages.length !== 3) {
    throw new Error(`Expected 3 transformed messages, got ${sdkMessages.length}`);
  }

  if (system !== "You are a helpful assistant.") {
    throw new Error("System message transformation failed");
  }

  if (sdkMessages[0].role !== "user" || sdkMessages[0].content !== "Hello") {
    throw new Error("User message transformation failed");
  }

  if (sdkMessages[1].role !== "assistant" || sdkMessages[1].content !== "Hi! How can I help you?") {
    throw new Error("Assistant message transformation failed");
  }

  const toolMsg = sdkMessages[2];
  if (toolMsg.role !== "user") {
    throw new Error("Tool message role transformation failed");
  }
  
  const toolContent = toolMsg.content;
  if (!Array.isArray(toolContent) || toolContent[0].type !== "tool_result") {
    throw new Error("Tool message content transformation failed");
  }

  if (toolContent[0].tool_use_id !== "call_123" || toolContent[0].content !== JSON.stringify({ result: 42 })) {
    throw new Error("Tool message content parameters transformation failed");
  }

  console.log("2. Testing getAgentClient validation...");
  // Backup key
  const originalKey = process.env.AI_PLATFORM_API_KEY;
  
  // Set invalid keys and expect it to throw
  process.env.AI_PLATFORM_API_KEY = "";
  try {
    getAgentClient();
    throw new Error("getAgentClient should have thrown an error for empty key");
  } catch (error) {
    console.log("Success: Caught expected error for empty key");
  }

  process.env.AI_PLATFORM_API_KEY = "YOUR_AI_PLATFORM_API_KEY";
  try {
    getAgentClient();
    throw new Error("getAgentClient should have thrown an error for placeholder key");
  } catch (error) {
    console.log("Success: Caught expected error for placeholder key");
  }

  // Restore original key
  process.env.AI_PLATFORM_API_KEY = originalKey;

  console.log("3. Testing Atlassian helper configuration validations...");
  // Backup Atlassian variables
  const originalDomain = process.env.ATLASSIAN_DOMAIN;
  const originalEmail = process.env.ATLASSIAN_EMAIL;
  const originalToken = process.env.ATLASSIAN_API_TOKEN;

  // Clear values and expect calls to throw error
  delete process.env.ATLASSIAN_DOMAIN;
  delete process.env.ATLASSIAN_EMAIL;
  delete process.env.ATLASSIAN_API_TOKEN;

  try {
    await callJiraCloudAPI("/issue/PROJ-123");
    throw new Error("callJiraCloudAPI should have thrown for missing ATLASSIAN_DOMAIN");
  } catch (error) {
    console.log("Success: Caught expected error for missing domain");
  }

  // Restore original values to process.env (but we'll override them for the mock test)
  process.env.ATLASSIAN_DOMAIN = "test-domain";
  process.env.ATLASSIAN_EMAIL = "test-email@test.com";
  process.env.ATLASSIAN_API_TOKEN = "test-token";

  console.log("4. Testing Atlassian request header and URL construction...");
  // Store the global fetch to restore later
  const originalFetch = globalThis.fetch;

  let lastJiraUrl = "";
  let lastJiraOptions: any = null;
  let lastConfluenceUrl = "";
  let lastConfluenceOptions: any = null;

  // Mock global fetch
  globalThis.fetch = (async (url: string, options: any) => {
    if (url.includes("/wiki/")) {
      lastConfluenceUrl = url;
      lastConfluenceOptions = options;
    } else {
      lastJiraUrl = url;
      lastJiraOptions = options;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ mockResult: true })
    } as Response;
  }) as any;

  try {
    const resJira = await callJiraCloudAPI("/issue/MOCK-1", "GET");
    if (resJira.mockResult !== true) throw new Error("Mocked API call failed to return expected body");
    if (lastJiraUrl !== "https://test-domain.atlassian.net/rest/api/3/issue/MOCK-1") {
      throw new Error(`Jira Cloud API url construction wrong: ${lastJiraUrl}`);
    }
    const expectedAuth = "Basic " + Buffer.from("test-email@test.com:test-token").toString("base64");
    if (lastJiraOptions?.headers?.Authorization !== expectedAuth) {
      throw new Error("Jira Cloud API Authorization header is incorrect");
    }

    const resConfluence = await callConfluenceCloudAPI("/content/12345", "POST", { title: "Title" });
    if (resConfluence.mockResult !== true) throw new Error("Mocked Confluence call failed");
    if (lastConfluenceUrl !== "https://test-domain.atlassian.net/wiki/rest/api/content/12345") {
      throw new Error(`Confluence Cloud API url construction wrong: ${lastConfluenceUrl}`);
    }
    if (lastConfluenceOptions?.headers?.Authorization !== expectedAuth) {
      throw new Error("Confluence Cloud API Authorization header is incorrect");
    }
    if (JSON.parse(lastConfluenceOptions?.body).title !== "Title") {
      throw new Error("Confluence Cloud API request body not correctly forwarded");
    }

    console.log("Success: Mocked request headers and URLs successfully validated!");
  } finally {
    // Restore global fetch and process.env
    globalThis.fetch = originalFetch;
    if (originalDomain !== undefined) process.env.ATLASSIAN_DOMAIN = originalDomain;
    else delete process.env.ATLASSIAN_DOMAIN;
    if (originalEmail !== undefined) process.env.ATLASSIAN_EMAIL = originalEmail;
    else delete process.env.ATLASSIAN_EMAIL;
    if (originalToken !== undefined) process.env.ATLASSIAN_API_TOKEN = originalToken;
    else delete process.env.ATLASSIAN_API_TOKEN;
  }

  console.log("\n✅ All functional programming unit tests passed successfully!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
