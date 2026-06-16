import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";

async function updatePageContent(pageId: string, transform: (body: string) => string) {
  try {
    console.log(`\n----------------------------------------`);
    console.log(`Fetching Page ID: ${pageId}...`);
    const page = await callConfluenceCloudAPI(`/content/${pageId}?expand=body.storage,version,space`);
    const title = page.title;
    const spaceKey = page.space.key;
    const currentVersion = page.version.number;
    let bodyHtml = page.body.storage.value;

    console.log(`Title: "${title}" (Current Version: ${currentVersion})`);

    // Separate the permission block at the bottom
    let permissionBlock = "";
    const permMatch = bodyHtml.match(/<hr\s*\/?>\s*<div class="document-permissions"[\s\S]*?<\/div>/i);
    if (permMatch) {
      permissionBlock = permMatch[0];
      bodyHtml = bodyHtml.replace(permissionBlock, "");
    }

    // Transform page body
    const transformedBody = transform(bodyHtml);

    // Re-append the permission block
    const updatedBodyHtml = transformedBody + permissionBlock;

    // Update the page
    const payload = {
      id: pageId,
      type: "page",
      title: title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: updatedBodyHtml,
          representation: "storage"
        }
      },
      version: {
        number: currentVersion + 1
      }
    };

    const response = await callConfluenceCloudAPI(`/content/${pageId}`, "PUT", payload);
    console.log(`Successfully updated page "${title}" to version ${response.version.number}`);
  } catch (error) {
    console.error(`Failed to update Page ID ${pageId}:`, error);
  }
}

async function main() {
  console.log("Starting Confluence Page Onboarding Details Update...");

  // 1. Update Admin & Legal page (131116)
  await updatePageContent("131116", (body) => {
    // Check if HR contact is already there to avoid duplicates
    if (body.includes("Trần Thị B") && body.includes("EMP002")) {
      console.log("HR Contact already present in Admin & Legal page.");
      return body;
    }
    const addition = `<p><strong>Thông tin liên hệ HR phụ trách nhận hồ sơ:</strong> Chị Trần Thị B (Mã nhân viên: <code>EMP002</code>, email: <code>b.tt@claw26-team210.com.vn</code>) tại quầy HR ở văn phòng làm việc.</p>`;
    // Append it before the backtracking link if any, or just at the end
    const backLinkIndex = body.lastIndexOf("<p><a href=");
    if (backLinkIndex !== -1) {
      return body.substring(0, backLinkIndex) + addition + "<hr />" + body.substring(backLinkIndex);
    }
    return body + "<hr />" + addition;
  });

  // 2. Update Accounts & Devices page (131146)
  await updatePageContent("131146", (body) => {
    if (body.includes("Quy chuẩn phân quyền công cụ theo vai trò")) {
      console.log("Role-to-tool access whitelist already present.");
      return body;
    }
    const addition = `<h3>📋 Quy chuẩn phân quyền công cụ theo vai trò (Role-to-Tool Access Whitelist)</h3>
<p>Dựa trên vị trí công tác của bạn, vui lòng chỉ đăng ký quyền truy cập vào các công cụ nội bộ tương ứng:</p>
<ul>
  <li><strong>Software Engineer:</strong> Được phép truy cập tất cả công cụ (<code>Portal-Gateway</code>, <code>ClawMonitor</code>, <code>DataVault</code>, <code>KubeConsole</code>).</li>
  <li><strong>Product Manager / Product Owner:</strong> Chỉ được phép truy cập <code>Portal-Gateway</code>, <code>ClawMonitor</code> (quyền xem), và <code>DataVault</code> (quyền xem Staging/Dev).</li>
  <li><strong>HR Specialist / Accountant:</strong> Chỉ được phép truy cập <code>Portal-Gateway</code>.</li>
  <li><strong>Security Lead:</strong> Được phép truy cập toàn bộ hệ thống để phục vụ giám sát bảo mật.</li>
</ul>`;
    const tableIndex = body.lastIndexOf("</table>");
    if (tableIndex !== -1) {
      return body.substring(0, tableIndex + 8) + "<hr />" + addition + body.substring(tableIndex + 8);
    }
    return body + "<hr />" + addition;
  });

  // 3. Update Human Connection page (131168)
  await updatePageContent("131168", (body) => {
    if (body.includes("Danh sách phân công Buddy")) {
      console.log("Buddy assignment table already present.");
      return body;
    }
    const addition = `<h3>📋 Danh sách phân công Buddy (Buddy Assignment Matrix)</h3>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr style="background-color: #f2f2f2;">
      <th>Nhân viên mới</th>
      <th>Mã nhân viên mới</th>
      <th>Bộ phận</th>
      <th>Buddy đồng hành</th>
      <th>Mã nhân viên Buddy</th>
      <th>Liên hệ Microsoft Teams</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dương Đức Trọng</td>
      <td><code>EMP100</code></td>
      <td>Product</td>
      <td>Nguyễn Văn A (Senior Engineer)</td>
      <td><code>EMP001</code></td>
      <td><code>a.nv@claw26-team210.com.vn</code></td>
    </tr>
    <tr>
      <td>Trần Thị B</td>
      <td><code>EMP002</code></td>
      <td>HR</td>
      <td>Lê Văn C (Accountant)</td>
      <td><code>EMP003</code></td>
      <td><code>c.lv@claw26-team210.com.vn</code></td>
    </tr>
    <tr>
      <td>Lê Văn C</td>
      <td><code>EMP003</code></td>
      <td>Finance</td>
      <td>Trần Thị B (HR Specialist)</td>
      <td><code>EMP002</code></td>
      <td><code>b.tt@claw26-team210.com.vn</code></td>
    </tr>
    <tr>
      <td>Phạm Văn D</td>
      <td><code>EMP004</code></td>
      <td>Security</td>
      <td>Nguyễn Văn A (Senior Engineer)</td>
      <td><code>EMP001</code></td>
      <td><code>a.nv@claw26-team210.com.vn</code></td>
    </tr>
  </tbody>
</table>`;
    const buddyHeaderIndex = body.indexOf("Buddy của bạn là ai?");
    if (buddyHeaderIndex !== -1) {
      // Find the end of this list/section
      const nextHrIndex = body.indexOf("<hr />", buddyHeaderIndex);
      if (nextHrIndex !== -1) {
        return body.substring(0, nextHrIndex) + addition + "<hr />" + body.substring(nextHrIndex);
      }
    }
    return body + "<hr />" + addition;
  });

  console.log("\nAll updates completed!");
}

main();
