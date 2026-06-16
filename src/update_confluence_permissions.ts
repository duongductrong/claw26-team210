import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";

const PERMISSIONS_MAPPING: Record<string, string[]> = {
  "65888": ["EMP001", "EMP002", "EMP003", "EMP004", "EMP100"], // 3. Kiến thức & Văn hoá (All)
  "98731": ["EMP001", "EMP002", "EMP100"],                     // Onboarding Agent - Tổng quan hệ thống
  "131116": ["EMP001", "EMP002", "EMP100"],                    // 1. Hành chính & Pháp lý
  "131146": ["EMP001", "EMP004", "EMP100"],                    // 2. Tài khoản & Thiết bị
  "131168": ["EMP001", "EMP002", "EMP100"],                    // 4. Kết nối con người
  "131192": ["EMP001"],                             // 5. Đào tạo & Phát triển
  "131214": ["EMP001", "EMP002", "EMP100"],                    // 6. Theo dõi & Phản hồi
  "98680": ["EMP001", "EMP100"],                              // Claw26-Team210 homepage
  "131319": ["EMP001", "EMP100"]                              // Employee Directory (Admins only)
};

async function updatePagePermissions(pageId: string, allowedIds: string[]) {
  try {
    console.log(`\n----------------------------------------`);
    console.log(`Processing Page ID: ${pageId}...`);
    
    // Fetch page details
    const page = await callConfluenceCloudAPI(`/content/${pageId}?expand=body.storage,version,space`);
    const title = page.title;
    const spaceKey = page.space.key;
    const currentVersion = page.version.number;
    let bodyHtml = page.body.storage.value;

    console.log(`Title: "${title}" in space: "${spaceKey}" (Current Version: ${currentVersion})`);

    // Remove existing permission block if present to prevent duplicate blocks
    bodyHtml = bodyHtml.replace(/<hr\s*\/?>\s*<div class="document-permissions"[\s\S]*?<\/div>/i, "");
    bodyHtml = bodyHtml.replace(/<hr\s*\/?>\s*<p><strong>Quyền truy cập tài liệu[\s\S]*?<\/p>/i, "");

    // Create the permission block
    const allowedIdsStr = allowedIds.join(", ");
    const permissionBlock = `<hr /><div class="document-permissions" style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;"><strong>Quyền truy cập tài liệu:</strong> ${allowedIdsStr}</div>`;

    const updatedBodyHtml = bodyHtml + permissionBlock;

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
  console.log("Starting Confluence Page Permissions Update...");
  for (const [pageId, allowedIds] of Object.entries(PERMISSIONS_MAPPING)) {
    await updatePagePermissions(pageId, allowedIds);
  }
  console.log("\nAll pages processed successfully!");
}

main();
