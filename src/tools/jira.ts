import { ToolDefinition } from "../core/types";
import { callJiraCloudAPI } from "../services/atlassian";

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
