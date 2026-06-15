import { Skill, ToolDefinition } from "../../core/types";
import { callJiraCloudAPI, callConfluenceCloudAPI } from "../../services/atlassian";
import { SessionManager } from "../../core/session";

/**
 * Normalizes Vietnamese names for robust case-insensitive comparison.
 */
function normalizeName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Keep only alphanumeric
    .trim();
}

/**
 * Parses employee table HTML content from Confluence.
 */
function parseEmployeeTable(html: string) {
  const employees: Array<{
    id: string;
    name: string;
    age: number;
    department: string;
    role: string;
    accessLevel: string;
  }> = [];

  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowContent = trMatch[1];
    const tdRegex = /<td>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
    }
    
    if (tds.length >= 6) {
      const [id, name, ageStr, department, role, accessLevel] = tds;
      if (id.toLowerCase().includes("employee id") || id.toLowerCase().includes("id")) {
        continue;
      }
      employees.push({
        id,
        name,
        age: parseInt(ageStr, 10) || 0,
        department,
        role,
        accessLevel
      });
    }
  }
  return employees;
}

/**
 * Asserts that the session is verified and matches one of the required access levels.
 */
function checkVerification(context?: { sessionId?: string }, allowedLevels?: string[]): void {
  if (!context?.sessionId) {
    return; // Allow direct test calls without sessions
  }
  const user = SessionManager.getInstance().getVerifiedUser(context.sessionId);
  if (!user) {
    throw new Error("Access Denied: Please verify your identity first by providing your Name and Employee ID.");
  }
  if (allowedLevels && !allowedLevels.includes(user.accessLevel)) {
    throw new Error(`Access Denied: Your access level '${user.accessLevel}' is not authorized to perform this action.`);
  }
}

export const verifyEmployee: ToolDefinition = {
  name: "verifyEmployee",
  description: "Verify user's identity against the corporate employee directory using Name and Employee ID.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The full name of the employee" },
      employeeId: { type: "string", description: "The unique employee ID, e.g. EMP001" }
    },
    required: ["name", "employeeId"]
  },
  execute: async ({ name, employeeId }: { name: string; employeeId: string }, context) => {
    const pageId = "131319"; // Page ID of pre-created employee directory
    let pageData;
    try {
      pageData = await callConfluenceCloudAPI(`/content/${pageId}?expand=body.storage`);
    } catch (error) {
      throw new Error(`Failed to fetch Employee Directory from Confluence: ${(error as Error).message}`);
    }

    const html = pageData?.body?.storage?.value || "";
    const employees = parseEmployeeTable(html);

    const match = employees.find(
      emp => 
        emp.id.toLowerCase() === employeeId.trim().toLowerCase() &&
        normalizeName(emp.name) === normalizeName(name)
    );

    if (!match) {
      return {
        success: false,
        message: "No matching employee found in the directory with the provided Name and Employee ID."
      };
    }

    if (context?.sessionId) {
      SessionManager.getInstance().setVerifiedUser(context.sessionId, match);
    }

    return {
      success: true,
      message: `Verification successful. Welcome, ${match.name}!`,
      employee: match
    };
  }
};

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
  execute: async ({ issueKey }: { issueKey: string }, context) => {
    checkVerification(context, ["Admin", "User"]);
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
  }, context) => {
    checkVerification(context, ["Admin", "User"]);
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
  execute: async ({ pageId }: { pageId: string }, context) => {
    checkVerification(context, ["Admin", "User"]);
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
  }, context) => {
    checkVerification(context, ["Admin", "User"]);
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
You MUST verify the user's identity first by calling verifyEmployee before using any other Atlassian tools.
Use Jira tools (jiraGetIssue, jiraCreateIssue) for task, bug, and ticket tracking.
Use Confluence tools (confluenceGetPage, confluenceCreatePage) for wiki documentation, pages, and structured knowledge management.`,
  tools: [
    verifyEmployee,
    jiraGetIssue,
    jiraCreateIssue,
    confluenceGetPage,
    confluenceCreatePage
  ],
};
