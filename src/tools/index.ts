import { ToolDefinition } from "../core/types";
import { confluenceCreatePage, confluenceGetPage } from "./confluence";
import { jiraCreateIssue, jiraGetIssue } from "./jira";
import { getSystemTime } from "./system";

export const agentTools: ToolDefinition[] = [
  getSystemTime,
  jiraGetIssue,
  jiraCreateIssue,
  confluenceGetPage,
  confluenceCreatePage,
];
