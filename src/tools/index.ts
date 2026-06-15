import { ToolDefinition } from "../core/types";
import { getSystemTime } from "../skills/system/index";
import { jiraGetIssue, jiraCreateIssue, confluenceGetPage, confluenceCreatePage } from "../skills/atlassian/index";
import { createOrUpdateArtifact, readArtifact, listArtifacts } from "../skills/artifacts/index";

export const agentTools: ToolDefinition[] = [
  getSystemTime,
  jiraGetIssue,
  jiraCreateIssue,
  confluenceGetPage,
  confluenceCreatePage,
  createOrUpdateArtifact,
  readArtifact,
  listArtifacts,
];
