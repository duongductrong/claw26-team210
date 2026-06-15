import { getAgentClient, transformToSDKMessages } from "./core/client";
import { ChatMessage, Skill } from "./core/types";
import { callJiraCloudAPI, callConfluenceCloudAPI } from "./services/atlassian";
import { formatMarkdownToPlainText } from "./utils/formatter";
import { getEnv } from "./utils/env";
import { initSkills } from "./skills";
import { SkillsRegistry } from "./core/registry";
import { ArtifactsManager } from "./core/artifacts";
import { SessionManager } from "./core/session";
import { verifyEmployee, confluenceGetPage } from "./skills/atlassian/index";
import { saveUserPreference, getUserPreferences } from "./skills/memory/index";

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

  console.log("7. Testing SkillsRegistry...");
  const registry = SkillsRegistry.getInstance();
  // Clear registry to start clean for registry tests
  registry.clear();

  // Register a mock skill
  const mockSkill: Skill = {
    id: "mock-skill",
    name: "Mock Skill",
    description: "For testing purposes",
    systemPromptAdditions: "Mock system instruction additions.",
    tools: [
      {
        name: "mockTool",
        description: "A mock tool",
        input_schema: { type: "object", properties: {} },
        execute: async () => ({ mock: "ok" })
      }
    ]
  };

  registry.register(mockSkill);

  const activeSkills = registry.getActiveSkills();
  if (activeSkills.length !== 1 || activeSkills[0].id !== "mock-skill") {
    throw new Error("SkillsRegistry failed to register or activate skill");
  }

  const additions = registry.getSystemPromptAdditions();
  if (additions !== "Mock system instruction additions.") {
    throw new Error(`Expected prompt additions 'Mock system instruction additions.', got '${additions}'`);
  }

  const activeTools = registry.getActiveTools();
  if (activeTools.length !== 1 || activeTools[0].name !== "mockTool") {
    throw new Error("SkillsRegistry failed to retrieve active tools");
  }

  // Deactivate skill
  registry.deactivate("mock-skill");
  if (registry.getActiveTools().length !== 0) {
    throw new Error("SkillsRegistry failed to deactivate skill");
  }

  // Activate skill again
  registry.activate("mock-skill");
  if (registry.getActiveTools().length !== 1) {
    throw new Error("SkillsRegistry failed to re-activate skill");
  }

  // Reset and load default skills
  registry.clear();
  initSkills();
  if (registry.getSkills().length !== 4) {
    throw new Error(`Expected 4 default skills, got ${registry.getSkills().length}`);
  }

  console.log("Success: SkillsRegistry operations validated!");

  console.log("8. Testing ArtifactsManager...");
  // Backup env variable
  const originalArtifactsDir = process.env.AGENT_ARTIFACTS_DIR;
  // Use a temporary test directory
  process.env.AGENT_ARTIFACTS_DIR = "./test-artifacts";

  const artifactsManager = ArtifactsManager.getInstance();
  
  // Clean up any test leftovers if any
  try {
    await artifactsManager.deleteArtifact("test-doc.md");
  } catch {}

  // Save an artifact
  const art = await artifactsManager.saveArtifact(
    "Test Document",
    "markdown",
    "# Hello Test\nThis is a test artifact.",
    "test-doc.md"
  );

  if (art.id !== "test-doc.md") {
    throw new Error(`Expected artifact ID 'test-doc.md', got '${art.id}'`);
  }
  if (art.title !== "Test Document") {
    throw new Error("Artifact title mismatch");
  }

  // Read artifact
  const readContent = await artifactsManager.readArtifact("test-doc.md");
  if (readContent !== "# Hello Test\nThis is a test artifact.") {
    throw new Error(`Artifact read content mismatch: '${readContent}'`);
  }

  // List artifacts
  const list = await artifactsManager.listArtifacts();
  const found = list.find(a => a.id === "test-doc.md");
  if (!found) {
    throw new Error("Saved artifact not found in list");
  }

  // Delete artifact
  const deleted = await artifactsManager.deleteArtifact("test-doc.md");
  if (!deleted) {
    throw new Error("Failed to delete artifact");
  }

  // Verify deletion
  const listAfterDelete = await artifactsManager.listArtifacts();
  if (listAfterDelete.some(a => a.id === "test-doc.md")) {
    throw new Error("Artifact still exists after deletion");
  }

  // Clean up test directory
  const fs = await import("fs/promises");
  try {
    await fs.rmdir("./test-artifacts");
  } catch {}

  // Restore env
  if (originalArtifactsDir !== undefined) {
    process.env.AGENT_ARTIFACTS_DIR = originalArtifactsDir;
  } else {
    delete process.env.AGENT_ARTIFACTS_DIR;
  }

  console.log("Success: ArtifactsManager operations validated!");

  console.log("9. Testing SessionManager...");
  const sessionManager = SessionManager.getInstance();
  sessionManager.clearAll();

  const session1 = sessionManager.getSession("session-1");
  if (session1.length !== 1 || session1[0].role !== "system") {
    throw new Error("SessionManager failed to initialize session history");
  }

  sessionManager.updateSession("session-1", [
    ...session1,
    { role: "user", content: "Hi" } as any
  ]);

  const updatedSession = sessionManager.getSession("session-1");
  if (updatedSession.length !== 2 || updatedSession[1].content !== "Hi") {
    throw new Error("SessionManager failed to update session history");
  }

  sessionManager.clearSession("session-1");
  const clearedSession = sessionManager.getSession("session-1");
  if (clearedSession.length !== 1 || clearedSession[0].role !== "system") {
    throw new Error("SessionManager failed to clear session");
  }

  console.log("Success: SessionManager operations validated!");

  console.log("10. Testing Employee Verification & Access Control...");
  const sessionManagerTest = SessionManager.getInstance();
  sessionManagerTest.clearAll();
  const testSessionId = "test-verification-session";

  // Mock fetch and environment variables for the test
  const originalFetchTest = globalThis.fetch;
  const originalDomainTest = process.env.ATLASSIAN_DOMAIN;
  const originalEmailTest = process.env.ATLASSIAN_EMAIL;
  const originalTokenTest = process.env.ATLASSIAN_API_TOKEN;

  process.env.ATLASSIAN_DOMAIN = "mock-domain.atlassian.net";
  process.env.ATLASSIAN_EMAIL = "mock@mock.com";
  process.env.ATLASSIAN_API_TOKEN = "mock-token";

  const mockTableHtml = `
    <table>
      <thead>
        <tr>
          <th>Employee ID</th>
          <th>Full Name</th>
          <th>Age</th>
          <th>Department</th>
          <th>Role</th>
          <th>Access Level</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>EMP100</td>
          <td>Duong Duc Trong</td>
          <td>24</td>
          <td>Product</td>
          <td>Product Manager</td>
          <td>Admin</td>
        </tr>
      </tbody>
    </table>
  `;

  globalThis.fetch = (async (url: string) => {
    if (url.includes("/wiki/rest/api/content/131319")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          body: {
            storage: {
              value: mockTableHtml,
              representation: "storage"
            }
          }
        })
      } as Response;
    }
    // Fallback for other calls
    return {
      ok: true,
      status: 200,
      json: async () => ({})
    } as Response;
  }) as any;

  try {
    // Verify that other tools throw Access Denied before verification
    try {
      await confluenceGetPage.execute({ pageId: "65805" }, { sessionId: testSessionId });
      throw new Error("confluenceGetPage should have failed with Access Denied before verification");
    } catch (error) {
      if (!(error as Error).message.includes("Access Denied")) {
        throw error;
      }
      console.log("Success: confluenceGetPage threw expected Access Denied");
    }

    // Run verifyEmployee with invalid employee
    const failVerify = await verifyEmployee.execute({ name: "Unknown User", employeeId: "EMP999" }, { sessionId: testSessionId });
    if (failVerify.success !== false) {
      throw new Error("verifyEmployee should have failed for unknown user");
    }
    console.log("Success: verifyEmployee failed as expected for invalid user");

    // Run verifyEmployee with valid employee (EMP100: Duong Duc Trong)
    const successVerify = await verifyEmployee.execute({ name: "Duong Duc Trong", employeeId: "EMP100" }, { sessionId: testSessionId });
    if (successVerify.success !== true) {
      throw new Error(`verifyEmployee failed: ${successVerify.message}`);
    }
    console.log("Success: verifyEmployee succeeded for valid user Duong Duc Trong!");

    // Verify that metadata is saved in session
    const verifiedUser = sessionManagerTest.getVerifiedUser(testSessionId);
    if (!verifiedUser || verifiedUser.id !== "EMP100") {
      throw new Error("SessionManager did not save verified user correctly");
    }
    console.log("Success: SessionManager successfully tracks verified user EMP100");

    // Verify that other tools work after verification
    try {
      await confluenceGetPage.execute({ pageId: "65805" }, { sessionId: testSessionId });
      console.log("Success: confluenceGetPage bypassed Access Denied check after verification!");
    } catch (error) {
      if ((error as Error).message.includes("Access Denied")) {
        throw error;
      }
      console.log("Success: confluenceGetPage bypassed Access Denied check after verification!");
    }

    console.log("11. Testing Memory Skill & Local Fallback...");
    // Save preference
    const saveRes = await saveUserPreference.execute({ fact: "Likes green tea" }, { sessionId: testSessionId });
    if (saveRes.success !== true) {
      throw new Error(`saveUserPreference failed: ${saveRes.message}`);
    }
    console.log("Success: saveUserPreference saved fact successfully!");

    // Retrieve preferences
    const getRes = await getUserPreferences.execute({ query: "green tea" }, { sessionId: testSessionId });
    if (getRes.userId !== "EMP100" || !getRes.preferences.includes("Likes green tea")) {
      throw new Error(`getUserPreferences failed to retrieve correct preferences. Got: ${JSON.stringify(getRes)}`);
    }
    console.log("Success: getUserPreferences retrieved correct preferences!");

  } finally {
    // Restore fetch and env variables
    globalThis.fetch = originalFetchTest;
    if (originalDomainTest !== undefined) process.env.ATLASSIAN_DOMAIN = originalDomainTest;
    else delete process.env.ATLASSIAN_DOMAIN;
    if (originalEmailTest !== undefined) process.env.ATLASSIAN_EMAIL = originalEmailTest;
    else delete process.env.ATLASSIAN_EMAIL;
    if (originalTokenTest !== undefined) process.env.ATLASSIAN_API_TOKEN = originalTokenTest;
    else delete process.env.ATLASSIAN_API_TOKEN;
  }

  console.log("\n✅ All functional programming unit tests passed successfully!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
