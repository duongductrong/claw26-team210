# 🤖 Smart AI Onboarding Assistant (TypeScript & AgentBase)

<div align="center">
  <img src="assets/thumbnail.png" alt="AI Onboarding Assistant Banner" width="800"/>
</div>

---

This repository houses the source code for a **Zero-Trust AI Onboarding Assistant** built in **TypeScript** using the `@anthropic-ai/sdk` and integrated with **Zalo Bot**. The agent is designed to streamline the corporate onboarding process for new hires by serving as a single point of interaction for internal wiki pages (Confluence), task tracking (Jira), and secure personnel directories.

The agent is powered by the `qwen/qwen3-5-27b` model on the **VNG Cloud MaaS AI Platform** and optimized for production deployment on the **GreenNode AgentBase** platform.

---

## 🌟 Core Features & Business Value

1. **Zero-Trust Employee Verification**
   - New users must verify their identity by providing their **Name** and **Employee ID** (`EMPxxx`) before retrieving any corporate info.
   - Credentials are dynamically checked against the secure Employee Directory on Confluence.
2. **Role-Based Access Control (RBAC)**
   - Automatically handles user roles (Admin, User, Restricted).
   - Enforces page-level permission checks (access denied is thrown and handled gracefully if a user tries to access a restricted Confluence page).
3. **Seamless Jira & Confluence Integrations**
   - Allows users to search, list, read, and create Confluence pages and Jira tickets.
   - Operates using a natural query interface: users don't need to specify page IDs or space keys. The agent finds them automatically.
4. **Zalo Bot & Messaging Channel Optimization**
   - Automatically converts Markdown structures (including complex tables) into clean, plain-text formats readable in Zalo.
   - Splits long responses to fit Zalo's message size limits seamlessly.
5. **Strict Out-of-Scope Defense**
   - Refuses out-of-scope prompts (e.g. general chit-chat, math equations, translation) and redirects users back to corporate onboarding tasks.

---

## 🏗️ Architecture Overview

The system is built with a **modular, decoupled architecture** using **functional programming** practices:

- **Dynamic System Prompt**: Built dynamically based on the active skills and current user session verification context.
- **Skills & Tools Registry**: Modularity is achieved via the `SkillsRegistry`. Each skill package (e.g. `atlassian`, `memory`, `artifacts`, `system`) exports its own tools and prompt additions, registering itself to the agent runtime.
- **Reasoning Loop**: The agent performs a multi-step reasoning loop (up to 5 steps) to resolve complex, nested tool calls.

> [!TIP]
> For a detailed look at the folders, sequence diagrams, and flow charts, refer to the [Detailed Project Architecture & Structure](docs/STRUCTURE.md).

---

## 📂 Project Structure

```
.
├── assets/                  # Images and media assets
├── docs/                    # Detailed architectural documents
│   └── STRUCTURE.md         # Full structure and sequence diagrams
├── src/
│   ├── cli/                 # Command line chat interface
│   ├── controllers/         # Web HTTP request controllers
│   ├── core/                # Core Agent runtime (reasoning loop, session, registry)
│   ├── services/            # Client connectors (Atlassian, Zalo, Memory)
│   ├── skills/              # Domain-specific modules (atlassian, artifacts, memory, system)
│   ├── utils/               # Formatting, env, and helpers
│   ├── server.ts            # Express server entry point
│   └── index.ts             # CLI Mode entry point
└── Dockerfile               # Production containerization
```

---

## 🚀 Setup & Execution Guide

### 1. Pre-requisites & Installation
Ensure you have **Node.js (v20+)** and **pnpm** installed.
Clone the repository, then install dependencies:
```bash
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
AI_PLATFORM_API_KEY="your_api_key_here"
AI_PLATFORM_BASE_URL="https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1"

ATLASSIAN_DOMAIN="your-company.atlassian.net"
ATLASSIAN_EMAIL="your-atlassian-email@company.com"
ATLASSIAN_API_TOKEN="your_atlassian_api_token"

ZALO_BOT_TOKEN="your_zalo_bot_token_here"
ZALO_BOT_POLLING="true" # Set to true to test locally using polling
```

### 3. Run the Agent in Interactive CLI Mode
Test the agent's behavior directly in your terminal:
```bash
pnpm start
```

### 4. Run the Express HTTP Server
Start the production-ready HTTP server on port 3000 (or the port defined by your environment):
```bash
pnpm run server
```
The server exposes the following endpoints:
- `GET /health` - Health Check.
- `POST /api/chat` - Chat Endpoint (Body: `{"message": "user text", "sessionId": "optional_id"}`).
- `GET /api/history` - Retrieve Chat Session History.
- `POST /api/clear` - Reset Chat Session Memory.
- `POST /webhook/zalo` - Webhook Endpoint for Zalo Server notifications.

---

## 🧪 Verification & Testing

The codebase includes an extensive testing and verification suite to ensure agent focus, proper routing, and authentication:

### 1. Automated Functional & Unit Tests
Verifies correct model client setup, Markdown table-to-text converters, Session Manager state, and Atlassian tool mock behaviors.
```bash
pnpm test
```

### 2. End-to-End Persona Focus & Flow Verification
Runs a multi-step conversation testing security checks, directory lookups, access validation, out-of-scope blocking, and natural wiki queries:
```bash
npx tsx src/verify_agent_focus.ts
```
