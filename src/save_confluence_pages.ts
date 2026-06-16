import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";
import * as fs from "fs/promises";
import * as path from "path";

async function main() {
  try {
    const spaceKey = "Claw26Team210";
    console.log(`Fetching pages in space "${spaceKey}"...`);
    const result = await callConfluenceCloudAPI(`/content?spaceKey=${spaceKey}&expand=body.storage,version`);
    
    // Create output directory
    const outputDir = path.join(process.cwd(), "src/scratch/confluence_pages");
    await fs.mkdir(outputDir, { recursive: true });

    for (const page of result.results) {
      const title = page.title.replace(/[/\\?%*:|"<>]/g, "-");
      const filename = `${page.id}_${title}.html`;
      const body = page.body?.storage?.value || "";
      await fs.writeFile(path.join(outputDir, filename), body, "utf-8");
      console.log(`Saved: ${filename} (${body.length} bytes)`);
    }
  } catch (error) {
    console.error("Error fetching pages:", error);
  }
}

main();
