---
trigger: always_on
---

# CodeGraph & Semantic Code Intelligence Guidelines

This document establishes the guidelines and standards for using **CodeGraph** (`@colbymchenry/codegraph`) for AI agents (Antigravity IDE, Cursor, Claude Code, Gemini CLI, Copilot) and developers across the OmniServices ecosystem.

---

## 1. Core Principles

1. **Surgical Context Over File Churn**:
   - Rather than crawling and reading dozens of source files one-by-one via grep or file discovery, AI agents should utilize CodeGraph's semantic MCP tools to fetch exact symbol definitions, caller/callee graphs, and cross-file relationships in single tool calls.
2. **Cross-Module Resolution**:
   - OmniServices relies on path aliases (`@auth/*`, `@gateway/*`, `@notification/*`, `@common`). CodeGraph traces these imports and dependencies seamlessly across microservices and shared libraries.
3. **100% Local & Privacy-First**:
   - All symbol indexing and graph storage occur locally in SQLite inside `.codegraph/`. No code or metadata leaves the local development machine.
4. **Auto-Syncing**:
   - Native file system watchers keep the knowledge graph synchronized in real-time on every file save.

---

## 2. Installation & Agent Setup

### 2.1. CLI Installation

```bash
# Global npm (Recommended)
npm install -g @colbymchenry/codegraph

# Or Standalone Installer (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

### 2.2. Agent Configuration (Included in `make install`)

Configure MCP server integration for installed AI tools (Antigravity IDE, Cursor, Claude Code, Gemini, Copilot):

```bash
make install
# or directly:
pnpm run codegraph:install
# or: codegraph install
```

### 2.3. Project Graph Initialization (One-time Setup)

Build the initial knowledge graph in `.codegraph/`:

```bash
pnpm run codegraph:init
# or
codegraph init
```

### 2.4. Manual Sync (If Needed)

Although auto-sync updates the graph on save, you can manually trigger a full synchronization:

```bash
make codegraph-sync
# or
pnpm run codegraph:sync
# or
codegraph sync
```

---

## 3. How AI Agents Use CodeGraph

| MCP Tool / Capability   | Purpose in OmniServices                                                                                 |
| :---------------------- | :------------------------------------------------------------------------------------------------------ |
| **`codegraph_explore`** | Retrieve symbol definitions, implementations, and related dependencies in one step.                     |
| **`codegraph_search`**  | Perform full-text / symbol search across microservices (`apps/*`) and shared libraries (`libs/*`).      |
| **`codegraph_impact`**  | Analyze upstream callers and downstream callees to verify blast radius before refactoring shared logic. |

---

## 4. Best Practices

1. **Keep `.codegraph/` Ignored**:
   - The `.codegraph/` SQLite directory is listed in `.gitignore`. Never commit graph index files to version control.
2. **Upgrade Periodically**:
   - Run `codegraph upgrade` to keep the Rust kernel and MCP server up to date.
3. **Index Reset**:
   - If the index becomes corrupted or out-of-sync, reset it by running `codegraph uninit && codegraph init`.
