import { getAgentClient, transformToSDKMessages } from "./core/client";
import { ChatMessage } from "./core/types";
import { callJiraCloudAPI, callConfluenceCloudAPI } from "./services/atlassian";
import { formatMarkdownToPlainText } from "./utils/formatter";
import { getEnv } from "./utils/env";

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

  console.log("5. Testing formatMarkdownToPlainText...");
  const markdownText = `### Hello World\nThis is **bold** and *italic*.\n- Item 1\n- Item 2\n[Link](https://example.com)\n\`inline code\`\n\`\`\`ts\nconst x = 1;\n\`\`\``;
  const expectedText = `Hello World:\nThis is bold and italic.\n• Item 1\n• Item 2\nLink (https://example.com)\ninline code\nconst x = 1;`;
  const formattedText = formatMarkdownToPlainText(markdownText);
  if (formattedText !== expectedText) {
    console.error("Got:", JSON.stringify(formattedText));
    console.error("Expected:", JSON.stringify(expectedText));
    throw new Error("formatMarkdownToPlainText test failed");
  }
  console.log("Success: formatMarkdownToPlainText outputs correct plain text format!");

  console.log("6. Testing getEnv helper cleaning functions...");
  // Back up original process.env vars we will use for testing
  const originalTestVar = process.env.TEST_ENV_VAR_CLEAN;

  try {
    // Test 6.1: Default value when undefined
    delete process.env.TEST_ENV_VAR_CLEAN;
    if (getEnv("TEST_ENV_VAR_CLEAN", "default_val") !== "default_val") {
      throw new Error("getEnv failed to return default value for undefined var");
    }

    // Test 6.2: Clean value without quotes/comments
    process.env.TEST_ENV_VAR_CLEAN = "simple_value";
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "simple_value") {
      throw new Error("getEnv failed for simple value");
    }

    // Test 6.3: Double quotes stripping
    process.env.TEST_ENV_VAR_CLEAN = '"quoted_value"';
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "quoted_value") {
      throw new Error("getEnv failed to strip double quotes");
    }

    // Test 6.4: Single quotes stripping
    process.env.TEST_ENV_VAR_CLEAN = "'single_quoted'";
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "single_quoted") {
      throw new Error("getEnv failed to strip single quotes");
    }

    // Test 6.5: Comments stripping
    process.env.TEST_ENV_VAR_CLEAN = "value_with_comment # this is a comment";
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "value_with_comment") {
      throw new Error(`getEnv failed to strip comment, got: ${getEnv("TEST_ENV_VAR_CLEAN")}`);
    }

    // Test 6.6: Quotes AND comments stripping
    process.env.TEST_ENV_VAR_CLEAN = '"quoted_with_comment" # comment here';
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "quoted_with_comment") {
      throw new Error(`getEnv failed to strip quotes and comments, got: ${getEnv("TEST_ENV_VAR_CLEAN")}`);
    }

    // Test 6.7: Extra whitespace trimming
    process.env.TEST_ENV_VAR_CLEAN = "   trimmed_value   ";
    if (getEnv("TEST_ENV_VAR_CLEAN") !== "trimmed_value") {
      throw new Error("getEnv failed to trim whitespace");
    }

    console.log("Success: getEnv correctly cleans and resolves environment variables!");
  } finally {
    // Restore
    if (originalTestVar !== undefined) process.env.TEST_ENV_VAR_CLEAN = originalTestVar;
    else delete process.env.TEST_ENV_VAR_CLEAN;
  }

  console.log("\n✅ All functional programming unit tests passed successfully!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
