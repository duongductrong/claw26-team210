import { Skill, ToolDefinition } from "./types";

export class SkillsRegistry {
  private static instance: SkillsRegistry;
  private skills = new Map<string, Skill>();
  private activeSkillIds = new Set<string>();

  private constructor() {}

  public static getInstance(): SkillsRegistry {
    if (!SkillsRegistry.instance) {
      SkillsRegistry.instance = new SkillsRegistry();
    }
    return SkillsRegistry.instance;
  }

  /**
   * Registers a new skill in the registry. Automatically activates it by default.
   */
  public register(skill: Skill): void {
    this.skills.set(skill.id, skill);
    this.activeSkillIds.add(skill.id);
  }

  /**
   * Activates a registered skill.
   */
  public activate(id: string): void {
    if (this.skills.has(id)) {
      this.activeSkillIds.add(id);
    }
  }

  /**
   * Deactivates a registered skill.
   */
  public deactivate(id: string): void {
    this.activeSkillIds.delete(id);
  }

  /**
   * Retrieves all registered skills.
   */
  public getSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Retrieves all active skills.
   */
  public getActiveSkills(): Skill[] {
    return Array.from(this.activeSkillIds)
      .map(id => this.skills.get(id))
      .filter((s): s is Skill => !!s);
  }

  /**
   * Gathers all tools from active skills.
   */
  public getActiveTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    const seen = new Set<string>();
    
    for (const skill of this.getActiveSkills()) {
      for (const tool of skill.tools) {
        if (!seen.has(tool.name)) {
          seen.add(tool.name);
          tools.push(tool);
        }
      }
    }
    return tools;
  }

  /**
   * Combines all system prompt additions from active skills.
   */
  public getSystemPromptAdditions(): string {
    return this.getActiveSkills()
      .map(s => s.systemPromptAdditions)
      .filter((add): add is string => !!add)
      .join("\n\n");
  }

  /**
   * Resets/clears all registered skills (useful for tests).
   */
  public clear(): void {
    this.skills.clear();
    this.activeSkillIds.clear();
  }
}
