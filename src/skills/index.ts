import { SkillsRegistry } from "../core/registry";
import { systemSkill } from "./system/index";
import { atlassianSkill } from "./atlassian/index";
import { artifactsSkill } from "./artifacts/index";
import { memorySkill } from "./memory/index";

export function initSkills(): void {
  const registry = SkillsRegistry.getInstance();
  
  // Register default skills
  registry.register(systemSkill);
  registry.register(atlassianSkill);
  registry.register(artifactsSkill);
  registry.register(memorySkill);
}
