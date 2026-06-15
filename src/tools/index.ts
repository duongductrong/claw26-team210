import { ToolDefinition } from "../core/types";
import { getSystemTime } from "../skills/system/index";
import { jiraGetIssue, jiraCreateIssue, confluenceGetPage, confluenceCreatePage, verifyEmployee } from "../skills/atlassian/index";
import { createOrUpdateArtifact, readArtifact, listArtifacts } from "../skills/artifacts/index";
import { saveUserPreference, getUserPreferences } from "../skills/memory/index";

export const agentTools: ToolDefinition[] = [
  getSystemTime,
  verifyEmployee,
  jiraGetIssue,
  jiraCreateIssue,
  confluenceGetPage,
  confluenceCreatePage,
  createOrUpdateArtifact,
  readArtifact,
  listArtifacts,
  saveUserPreference,
  getUserPreferences,
];
