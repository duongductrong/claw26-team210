import { Skill, ToolDefinition } from "../../core/types";
import { callJiraCloudAPI, callConfluenceCloudAPI } from "../../services/atlassian";

export const jiraGetIssue: ToolDefinition = {
  name: "jiraGetIssue",
  description: "Retrieve details of a Jira issue by its key (e.g. PROJ-123).",
  input_schema: {
    type: "object",
    properties: {
      issueKey: { type: "string", description: "The Jira issue key, e.g. PROJ-123" }
    },
    required: ["issueKey"]
  },
  execute: async ({ issueKey }: { issueKey: string }) => {
    return await callJiraCloudAPI(`/issue/${issueKey}`);
  }
};

export const jiraCreateIssue: ToolDefinition = {
  name: "jiraCreateIssue",
  description: "Create a new Jira issue.",
  input_schema: {
    type: "object",
    properties: {
      projectKey: { type: "string", description: "The Jira project key, e.g. PROJ" },
      summary: { type: "string", description: "Brief summary of the issue" },
      description: { type: "string", description: "Detailed description of the issue" },
      issueType: { type: "string", description: "Type of issue, e.g. Bug, Task, Story. Default: Bug" }
    },
    required: ["projectKey", "summary"]
  },
  execute: async ({ projectKey, summary, description, issueType }: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType?: string;
  }) => {
    const payload = {
      fields: {
        project: { key: projectKey },
        summary: summary,
        description: description || "",
        issuetype: { name: issueType || "Bug" }
      }
    };
    return await callJiraCloudAPI("/issue", "POST", payload);
  }
};

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

export const atlassianSkill: Skill = {
  id: "atlassian",
  name: "Atlassian Integration Skill",
  description: "Allows reading/writing Jira issues and Confluence pages.",
  systemPromptAdditions: `You are equipped with Atlassian tools.
Use Jira tools (jiraGetIssue, jiraCreateIssue) for task, bug, and ticket tracking.
Use Confluence tools (confluenceGetPage, confluenceCreatePage) for wiki documentation, pages, and structured knowledge management.`,
  tools: [
    jiraGetIssue,
    jiraCreateIssue,
    confluenceGetPage,
    confluenceCreatePage
  ],
};
