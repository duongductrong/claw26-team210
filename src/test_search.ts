import dotenv from "dotenv";
dotenv.config();

import { callConfluenceCloudAPI } from "./services/atlassian";

async function main() {
  try {
    const query = "kiến thức";
    console.log(`Searching for query: "${query}" via CQL...`);
    const cql = `space='Claw26Team210' and (title ~ '${query}' or text ~ '${query}')`;
    const searchUrl = `/content/search?cql=${encodeURIComponent(cql)}&expand=body.storage,version`;
    const result = await callConfluenceCloudAPI(searchUrl);
    console.log("Search results count:", result.results.length);
    if (result.results.length > 0) {
      console.log("Keys of result.results[0]:", Object.keys(result.results[0]));
      console.log("result.results[0]:", JSON.stringify(result.results[0], null, 2));
    }
  } catch (error) {
    console.error("CQL Search failed:", error);
  }
}

main();
