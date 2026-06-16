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

  // Test 1: In-scope greeting and request for employee verification
  await testQuery(sessionId, "Chào bạn, mình là nhân viên mới, muốn xem thông tin tài liệu.");

  // Test 2: User provides verification info
  await testQuery(sessionId, "Mình tên là Duong Duc Trong, mã nhân viên EMP100");

  // Test 3: User asks about devices & setup process naturally (without providing page ID)
  await testQuery(sessionId, "Vị trí của mình nhận được thiết bị gì? quy trình làm việc như thế nào?");

  // Test 4: User asks about their assigned Buddy
  await testQuery(sessionId, "Ai là Buddy đồng hành cùng mình thế?");

  // Test 5: User asks about HR contact for document submission
  await testQuery(sessionId, "Hồ sơ nhân sự bản cứng Day 1 mình cần nộp cho ai ở văn phòng và liên hệ thế nào?");

  // Test 6: User asks about tool access whitelists for their role (Product Manager)
  await testQuery(sessionId, "Với vai trò Product Manager, mình cần đăng ký quyền truy cập vào các công cụ nội bộ nào?");

  // Test 7: User tries to access an unauthorized document (Training page restricted to EMP001)
  await testQuery(sessionId, "Cho mình xin nội dung tài liệu Đào tạo & Phát triển (Training & Development) nhé");

  // Test 8: Out-of-scope query
  await testQuery(sessionId, "1 + 1 = mấy");

  console.log(`\n========================================`);
  console.log(`✨ Verification completed successfully!`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Verification script failed:", err);
  process.exit(1);
});
