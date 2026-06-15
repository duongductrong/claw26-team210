import { ToolDefinition } from "../core/types";
import { callConfluenceCloudAPI } from "../services/atlassian";

export const confluenceGetPage: ToolDefinition = {
  name: "confluenceGetPage",
  description: "Get Confluence page details and HTML content by page ID.",
  input_schema: {
    type: "object",
    properties: {
      pageId: { type: "string", description: "The unique ID of the Confluence page" }
    },
    required: ["pageId"]
  },
  execute: async ({ pageId }: { pageId: string }) => {
    return await callConfluenceCloudAPI(`/content/${pageId}?expand=body.storage,version,space`);
  }
};

export const confluenceCreatePage: ToolDefinition = {
  name: "confluenceCreatePage",
  description: "Create a new page on Confluence.",
  input_schema: {
    type: "object",
    properties: {
      spaceKey: { type: "string", description: "The key of the space to create page in, e.g. DS" },
      title: { type: "string", description: "The title of the page" },
      bodyHtml: { type: "string", description: "The page content in HTML format" },
      parentId: { type: "string", description: "Optional ID of the parent page" }
    },
    required: ["spaceKey", "title", "bodyHtml"]
  },
  execute: async ({ spaceKey, title, bodyHtml, parentId }: {
    spaceKey: string;
    title: string;
    bodyHtml: string;
    parentId?: string;
  }) => {
    const payload: any = {
      type: "page",
      title: title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: bodyHtml,
          representation: "storage"
        }
      }
    };
    if (parentId) {
      payload.ancestors = [{ id: String(parentId) }];
    }
    return await callConfluenceCloudAPI("/content", "POST", payload);
  }
};
