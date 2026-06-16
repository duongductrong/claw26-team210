import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";

async function main() {
  try {
    const spaceKey = "Claw26Team210";
    console.log(`Fetching pages in space "${spaceKey}"...`);
    const result = await callConfluenceCloudAPI(`/content?spaceKey=${spaceKey}&expand=body.storage,version`);
    for (const page of result.results) {
      console.log(`\n========================================`);
      console.log(`ID: ${page.id}, Title: "${page.title}"`);
      const body = page.body?.storage?.value || "";
      console.log(`Body excerpt (first 500 chars):`);
      console.log(body.substring(0, 500));
    }
  } catch (error) {
    console.error("Error fetching pages:", error);
  }
}

main();
