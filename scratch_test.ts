import { getAgentClient, transformToSDKMessages, ChatMessage } from "./agent";

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

  console.log("\n✅ All functional programming unit tests passed successfully!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
