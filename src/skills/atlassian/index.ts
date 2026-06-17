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

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowContent = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
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

function verifyPageAccess(pageBody: string, user: any, pageTitle: string): void {
  if (!user) {
    return; // Allow bypass if no user context (e.g. testing)
  }
  const match = pageBody.match(/Quyền truy cập tài liệu:<\/strong>\s*([^<]+)/i);
  if (match) {
    const allowedTargets = match[1].split(",").map(item => item.trim().toUpperCase());
    const userLevel = user.accessLevel ? user.accessLevel.trim().toUpperCase() : "";
    const userId = user.id ? user.id.trim().toUpperCase() : "";
    
    const isAuthorized = allowedTargets.includes(userLevel) || allowedTargets.includes(userId);
    
    if (!isAuthorized) {
      throw new Error(`Access Denied: Tài khoản của bạn (${user.id || "không xác định"}) với vai trò '${user.accessLevel || "không xác định"}' không có quyền truy cập tài liệu này "${pageTitle}". Tài liệu này chỉ dành cho: ${match[1].trim()}.`);
    }
  }
}

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
    const pageData = await callConfluenceCloudAPI(`/content/${pageId}?expand=body.storage,version,space`);
    const user = context?.sessionId ? SessionManager.getInstance().getVerifiedUser(context.sessionId) : null;
    const bodyHtml = pageData?.body?.storage?.value || "";
    const title = pageData?.title || "";
    verifyPageAccess(bodyHtml, user, title);
    return pageData;
  }
};

export const confluenceSearchPages: ToolDefinition = {
  name: "confluenceSearchPages",
  description: "Search for Confluence pages by title or content keywords in the workspace.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Keyword query to search pages (e.g., 'thiết bị', 'onboarding', 'kiến thức')" }
    },
    required: ["query"]
  },
  execute: async ({ query }: { query: string }, context) => {
    checkVerification(context, ["Admin", "User"]);
    const user = context?.sessionId ? SessionManager.getInstance().getVerifiedUser(context.sessionId) : null;
    
    const cql = `space='Claw26Team210' and (title ~ '${query}' or text ~ '${query}')`;
    const searchUrl = `/content/search?cql=${encodeURIComponent(cql)}&expand=body.storage,version,space`;
    const searchResult = await callConfluenceCloudAPI(searchUrl);
    
    const results: any[] = [];
    if (searchResult.results && Array.isArray(searchResult.results)) {
      for (const page of searchResult.results) {
        const bodyHtml = page.body?.storage?.value || "";
        const title = page.title || "";
        try {
          verifyPageAccess(bodyHtml, user, title);
          results.push({
            id: page.id,
            title: page.title,
            body: bodyHtml
          });
        } catch (err) {
          // Filter out pages without access
        }
      }
    }
    return { query, results };
  }
};

export const confluenceListPages: ToolDefinition = {
  name: "confluenceListPages",
  description: "List all available Confluence pages (titles and IDs) in the workspace.",
  input_schema: {
    type: "object",
    properties: {}
  },
  execute: async (_, context) => {
    checkVerification(context, ["Admin", "User"]);
    const user = context?.sessionId ? SessionManager.getInstance().getVerifiedUser(context.sessionId) : null;
    
    const pageData = await callConfluenceCloudAPI(`/content?spaceKey=Claw26Team210&expand=body.storage,version`);
    const results: any[] = [];
    if (pageData.results && Array.isArray(pageData.results)) {
      for (const page of pageData.results) {
        const bodyHtml = page.body?.storage?.value || "";
        const title = page.title || "";
        try {
          verifyPageAccess(bodyHtml, user, title);
          results.push({
            id: page.id,
            title: page.title
          });
        } catch (err) {
          // Filter out pages without access
        }
      }
    }
    return { results };
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
Use Confluence tools (confluenceGetPage, confluenceSearchPages, confluenceListPages, confluenceCreatePage) for wiki documentation, pages, and structured knowledge management.
Always use confluenceSearchPages or confluenceListPages to look up documentation details based on the user's questions instead of asking for page IDs or space keys.`,
  tools: [
    verifyEmployee,
    jiraGetIssue,
    jiraCreateIssue,
    confluenceGetPage,
    confluenceSearchPages,
    confluenceListPages,
    confluenceCreatePage
  ],
};

