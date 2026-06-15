import fs from "fs/promises";
import path from "path";
import { getEnv } from "../utils/env";

const MEMORY_DIR = "./.agentbase";
const MEMORY_FILE = path.join(MEMORY_DIR, "memory_store.json");

export class AgentMemoryService {
  private static instance: AgentMemoryService;

  private constructor() {}

  public static getInstance(): AgentMemoryService {
    if (!AgentMemoryService.instance) {
      AgentMemoryService.instance = new AgentMemoryService();
    }
    return AgentMemoryService.instance;
  }

  /**
   * Saves a fact to long-term memory for a user (actorId).
   */
  public async saveFact(actorId: string, fact: string): Promise<{ success: boolean; message: string }> {
    const memoryId = getEnv("AGENT_MEMORY_ID");
    const clientId = getEnv("GREENNODE_CLIENT_ID");
    const clientSecret = getEnv("GREENNODE_CLIENT_SECRET");

    if (memoryId && clientId && clientSecret) {
      try {
        const token = await this.getPlatformToken(clientId, clientSecret);
        const url = `https://agentbase.api.vngcloud.vn/memory/memories/${memoryId}/memory-records:insert-directly`;
        const namespace = `/strategies/default/actors/${actorId}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ namespace, memory: fact })
        });
        if (response.ok) {
          return { success: true, message: `Fact saved to VNG Cloud memory under actor ${actorId}.` };
        }
        console.warn(`VNG Cloud memory save returned status ${response.status}. Falling back to local storage.`);
      } catch (err) {
        console.warn(`VNG Cloud memory save failed: ${(err as Error).message}. Falling back to local storage.`);
      }
    }

    return await this.saveLocalFact(actorId, fact);
  }

  /**
   * Queries long-term memory facts for a user (actorId).
   */
  public async queryFacts(actorId: string, query: string): Promise<string[]> {
    const memoryId = getEnv("AGENT_MEMORY_ID");
    const clientId = getEnv("GREENNODE_CLIENT_ID");
    const clientSecret = getEnv("GREENNODE_CLIENT_SECRET");

    if (memoryId && clientId && clientSecret) {
      try {
        const token = await this.getPlatformToken(clientId, clientSecret);
        const namespace = `/strategies/default/actors/${actorId}`;
        const url = `https://agentbase.api.vngcloud.vn/memory/memories/${memoryId}/memory-records:search?namespace=${encodeURIComponent(namespace)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query, limit: 10 })
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            return data.map((item: any) => item.memory || item.text || JSON.stringify(item));
          }
        }
        console.warn(`VNG Cloud memory search returned status ${response.status}. Falling back to local search.`);
      } catch (err) {
        console.warn(`VNG Cloud memory search failed: ${(err as Error).message}. Falling back to local search.`);
      }
    }

    return await this.searchLocalFacts(actorId, query);
  }

  private async getPlatformToken(clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch("https://iam.api.vngcloud.vn/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    if (!response.ok) {
      throw new Error(`Auth failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.access_token;
  }

  // --- Local Fallback ---

  private async saveLocalFact(actorId: string, fact: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.mkdir(MEMORY_DIR, { recursive: true });
      let store: { facts: Record<string, string[]> } = { facts: {} };
      try {
        const fileContent = await fs.readFile(MEMORY_FILE, "utf-8");
        store = JSON.parse(fileContent);
      } catch (e) {
        // file doesn't exist
      }

      if (!store.facts) store.facts = {};
      if (!store.facts[actorId]) store.facts[actorId] = [];
      
      if (!store.facts[actorId].includes(fact)) {
        store.facts[actorId].push(fact);
      }

      await fs.writeFile(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8");
      return { success: true, message: `Fact saved to local storage for user ${actorId}.` };
    } catch (error) {
      console.error("Local memory store write failed:", error);
      return { success: false, message: `Failed to save locally: ${(error as Error).message}` };
    }
  }

  private async searchLocalFacts(actorId: string, query: string): Promise<string[]> {
    try {
      const fileContent = await fs.readFile(MEMORY_FILE, "utf-8");
      const store = JSON.parse(fileContent);
      const userFacts = store.facts?.[actorId] || [];
      if (!query) return userFacts;

      const keywords = query.toLowerCase().split(/\s+/);
      return userFacts.filter((fact: string) => {
        const lowerFact = fact.toLowerCase();
        return keywords.some((kw: string) => lowerFact.includes(kw));
      });
    } catch (e) {
      return [];
    }
  }
}
