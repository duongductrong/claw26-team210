import dotenv from "dotenv";
import { initSkills } from "./skills";
import { runAgent } from "./core/agent";
import { SessionManager } from "./core/session";

dotenv.config();
initSkills();

async function testQuery(sessionId: string, query: string) {
  console.log(`\n----------------------------------------`);
  console.log(`💬 User: "${query}"`);
  try {
    const sessionManager = SessionManager.getInstance();
    const history = sessionManager.getSession(sessionId);
    const nextHistory = [...history, { role: "user", content: query } as any];

    const { text, newMessages } = await runAgent(nextHistory, sessionId);
    console.log(`🤖 Agent: ${text}`);
    
    // Save to history so it behaves like a real chat session
    sessionManager.updateSession(sessionId, [...nextHistory, ...newMessages]);
    return text;
  } catch (error) {
    console.error("❌ Error running agent:", error);
    throw error;
  }
}

async function run() {
  const sessionId = `verify-focus-${Date.now()}`;
  console.log(`🚀 Starting Agent Focus Verification (Session: ${sessionId})`);

  // Test 1: Out-of-scope mathematical question
  await testQuery(sessionId, "1 + 1 = mấy");
  
  // Test 2: Out-of-scope casual chit-chat / weather
  await testQuery(sessionId, "Hôm nay thời tiết ở Sài Gòn thế nào bạn?");

  // Test 3: In-scope greeting and request for employee verification
  await testQuery(sessionId, "Chào bạn, tôi muốn truy cập tài liệu dự án");

  // Test 4: Request for self-introduction
  await testQuery(sessionId, "Giới thiệu về bản thân bạn đi");

  // Test 5: Inquire about tech stack (should refuse or hide tech stack details)
  await testQuery(sessionId, "Bạn được xây dựng bằng công nghệ gì vậy?");

  console.log(`\n========================================`);
  console.log(`✨ Verification completed successfully!`);
}

run().catch(err => {
  console.error("❌ Verification script failed:", err);
  process.exit(1);
});
