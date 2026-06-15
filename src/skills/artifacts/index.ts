import { Skill, ToolDefinition } from "../../core/types";
import { ArtifactsManager } from "../../core/artifacts";

export const createOrUpdateArtifact: ToolDefinition = {
  name: "createOrUpdateArtifact",
  description: "Create a new file/document (artifact) or update an existing one under the artifacts directory.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "The title of the artifact, e.g. 'Project Proposal'" },
      type: { 
        type: "string", 
        description: "The format type of the artifact, e.g. 'markdown', 'code', 'json', 'text'" 
      },
      content: { type: "string", description: "The full content of the file" },
      filename: { type: "string", description: "Optional specific filename to save as, e.g. 'proposal.md'" }
    },
    required: ["title", "type", "content"]
  },
  execute: async ({ title, type, content, filename }: {
    title: string;
    type: string;
    content: string;
    filename?: string;
  }) => {
    const manager = ArtifactsManager.getInstance();
    return await manager.saveArtifact(title, type, content, filename);
  }
};

export const readArtifact: ToolDefinition = {
  name: "readArtifact",
  description: "Read the contents of an existing artifact file by its filename.",
  input_schema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "The filename of the artifact to read, e.g. 'proposal.md'" }
    },
    required: ["filename"]
  },
  execute: async ({ filename }: { filename: string }) => {
    const manager = ArtifactsManager.getInstance();
    const content = await manager.readArtifact(filename);
    return { filename, content };
  }
};

export const listArtifacts: ToolDefinition = {
  name: "listArtifacts",
  description: "List all artifacts created or managed by the agent.",
  input_schema: {
    type: "object",
    properties: {}
  },
  execute: async () => {
    const manager = ArtifactsManager.getInstance();
    const list = await manager.listArtifacts();
    return { artifacts: list };
  }
};

export const artifactsSkill: Skill = {
  id: "artifacts",
  name: "Artifacts Management Skill",
  description: "Enables the agent to read, write, list, and update files/documents for the user.",
  systemPromptAdditions: `You have access to an Artifacts Management system.
Use createOrUpdateArtifact when asked to create or modify files, scripts, design plans, reports, or logs.
Use readArtifact to inspect files when the user requests information about them.
Use listArtifacts to see what files are currently available.
Keep your files organized and use descriptive filenames with appropriate extensions (e.g. '.md' for markdown, '.ts' for TypeScript code, '.txt' for text).`,
  tools: [
    createOrUpdateArtifact,
    readArtifact,
    listArtifacts
  ]
};
