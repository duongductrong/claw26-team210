import fs from "fs/promises";
import path from "path";
import { getEnv } from "../utils/env";
import { Artifact } from "./types";

export class ArtifactsManager {
  private static instance: ArtifactsManager;
  private baseDir: string;

  private constructor() {
    this.baseDir = path.resolve(getEnv("AGENT_ARTIFACTS_DIR", "./artifacts"));
  }

  public static getInstance(): ArtifactsManager {
    if (!ArtifactsManager.instance) {
      ArtifactsManager.instance = new ArtifactsManager();
    }
    return ArtifactsManager.instance;
  }

  /**
   * Helper to ensure the artifacts directory exists.
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err) {
      // Ignore directory already exists errors
    }
  }

  /**
   * Saves a new or existing artifact to disk.
   */
  public async saveArtifact(
    title: string,
    type: "code" | "markdown" | "json" | "text" | string,
    content: string,
    filename?: string
  ): Promise<Artifact> {
    await this.ensureDirectory();

    // Generate filename if not provided
    const cleanFilename = filename 
      ? path.basename(filename)
      : `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.md`;

    const filePath = path.join(this.baseDir, cleanFilename);
    const exists = await this.fileExists(filePath);
    const now = new Date().toISOString();

    let createdAt = now;
    if (exists) {
      try {
        const stats = await fs.stat(filePath);
        createdAt = stats.birthtime.toISOString();
      } catch {
        // fallback
      }
    }

    await fs.writeFile(filePath, content, "utf8");

    const id = cleanFilename;

    return {
      id,
      title,
      type,
      content,
      path: filePath,
      createdAt,
      updatedAt: now,
    };
  }

  /**
   * Reads an artifact's content by filename.
   */
  public async readArtifact(filename: string): Promise<string> {
    await this.ensureDirectory();
    const filePath = path.join(this.baseDir, path.basename(filename));
    return await fs.readFile(filePath, "utf8");
  }

  /**
   * Lists all artifacts with their metadata (excluding content).
   */
  public async listArtifacts(): Promise<Omit<Artifact, "content">[]> {
    await this.ensureDirectory();
    const files = await fs.readdir(this.baseDir);
    const artifacts: Omit<Artifact, "content">[] = [];

    for (const file of files) {
      const filePath = path.join(this.baseDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          let type = "text";
          if (ext === ".md") type = "markdown";
          else if (ext === ".js" || ext === ".ts" || ext === ".py") type = "code";
          else if (ext === ".json") type = "json";

          artifacts.push({
            id: file,
            title: file.replace(/-/g, " ").replace(/\.[^/.]+$/, ""),
            type,
            path: filePath,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
          });
        }
      } catch (err) {
        // Skip un-statable files
      }
    }

    return artifacts;
  }

  /**
   * Deletes an artifact from disk.
   */
  public async deleteArtifact(filename: string): Promise<boolean> {
    await this.ensureDirectory();
    const filePath = path.join(this.baseDir, path.basename(filename));
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
