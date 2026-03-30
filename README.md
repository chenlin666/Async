# Async Shell

<p align="center">
  <img src="docs/assets/async-logo.svg" width="120" height="120" alt="Async Logo" />
</p>

<p align="center">
  <strong>The Agent-Centric AI IDE Shell.</strong><br>
  Built for developers who want a streamlined, autonomous agent workflow without the bloat.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/Electron-34-green" alt="Electron" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-blue" alt="React" />
  <img src="https://img.shields.io/badge/Monaco-0.52-blue" alt="Monaco Editor" />
</p>

---

[English](README.md) | [简体中文](README.zh-CN.md)

---

## 🌟 What is Async Shell?

Async Shell is an open-source, AI-native desktop application designed to be the primary interface between you and your AI agents. Unlike standard IDE extensions, Async is built from the ground up to prioritize the **Agent Loop**, providing a unified environment for multi-model chat, autonomous tool execution, and code review.

### Why use Async?

- **Agent-First Workflow**: Not just a side-chat. The agent has first-class access to your workspace, tools, and terminal. It follows a robust **Autonomous Loop** (Think -> Plan -> Execute -> Observe).
- **Extreme Transparency**: See the "brain" at work. Watch real-time **Streaming Tool Inputs** as the model generates JSON parameters, and review the **Tool Trajectory** with clear visual cards.
- **Complete Control**: Self-hosted and privacy-conscious. Use your own API keys with OpenAI, Anthropic, or Gemini. Your code and conversations stay on your machine.
- **Git-Native Experience**: Built-in Git service for status tracking, diff previews, and seamless integration between Agent changes and your repository state.
- **Lightweight & Fast**: A high-performance desktop shell built with Electron and React, featuring a clean three-pane layout for maximum productivity.

### 📸 Preview

<p align="center">
  <img src="docs/assets/async-main-screenshot.png" width="1024" alt="Async Main Interface" />
</p>

### 📋 Plan mode

In **Plan** mode, the model produces a structured plan (title, description, checklist, optional clarifying questions). You review the draft, adjust todos, then use **Start execution** (开始执行) to let the agent carry out the plan. Draft plans are saved under the app user-data directory (e.g. `.async/plans/`).

<p align="center">
  <img src="docs/assets/async-plan-mode.png" width="1024" alt="Async Plan mode — draft plan, task checklist, and Start execution" />
</p>

## ✨ Core Features

### 🤖 Autonomous Agent Loop
- **Streaming Tool Input**: Watch the model "type" its tool parameters (JSON) in real-time. This provides immediate feedback on what the agent is planning to do.
- **Tool Trajectory Visualization**: Live cards for `read_file`, `write_to_file`, `str_replace`, `search_files`, and shell commands.
- **Plan vs. Agent Mode**: 
  - **Plan Mode**: Model generates a structured Markdown plan with checklists and clarifying questions. You review and approve before execution.
  - **Agent Mode**: Direct tool-execution loop for rapid iteration and autonomous task completion.
- **Smart Context**: Automatic file-line positioning and highlighted ranges when the agent modifies code.

### 🧠 Multi-Model Intelligence
- **Native Adapters**: Optimized request paths for **Anthropic** (with Extended Thinking support), **OpenAI**, and **Gemini**.
- **Model Agnostic**: Any OpenAI-compatible API (Local LLMs via Ollama/vLLM, or aggregators) works out-of-the-box.
- **Thinking Support**: Built-in support for reasoning models (Claude 3.7 Thinking, o1-series) with dedicated streaming thinking blocks.

### 🛠️ Professional Developer Experience
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting, diff views, and multi-file management.
- **Git-Aware Workflow**: Integrated Git service handles status, diffs, staging, commits, and pushes directly from the UI.
- **Integrated xterm.js Terminal**: A dedicated terminal pane for running commands and observing agent-driven shell actions.
- **Rich Composer**: Support for **@-mentions** to reference files, multi-segment user messages, and persistent thread management.

## 🏗️ Technical Architecture

Async Shell is engineered for stability, security, and performance:

- **Main/Renderer Separation**: Clean IPC (Inter-Process Communication) architecture using Electron's `contextBridge` and `ipcMain`.
- **Stream-Centric Engine**: A custom `agentLoop.ts` handles the multi-round tool calling logic, supporting partial JSON parsing for real-time streaming.
- **Local-First Persistence**: Thread history, settings, and plans are stored locally as JSON/Markdown files in the user's data directory. No cloud sync required.
- **Git Service Layer**: A dedicated Node.js service for porcelain Git operations, ensuring the UI stays in sync with your local repository state.

## 🏗️ Project Structure

```text
async-shell/
├── main-src/                 # Bundled → electron/main.bundle.cjs (Node / Electron main)
│   ├── index.ts              # App entry: windows, userData, IPC registration
│   ├── agent/                # agentLoop.ts, toolExecutor.ts, agentTools.ts
│   ├── llm/                  # OpenAI / Anthropic / Gemini adapters & streaming
│   ├── ipc/register.ts       # ipcMain handlers (chat, threads, git, fs, agent, …)
│   ├── threadStore.ts        # Persistent threads + messages (JSON)
│   ├── settingsStore.ts      # settings.json
│   ├── gitService.ts         # Porcelain status, diff previews, commit/push
│   └── workspace.ts          # Open-folder root & safe path resolution
├── src/                      # Vite + React renderer
│   ├── App.tsx               # Shell layout, chat, composer modes, Git / explorer
│   ├── i18n/                 # Locale messages
│   └── …                     # Agent UI, Plan review, Monaco, terminal, …
├── electron/
│   ├── main.bundle.cjs       # esbuild output (do not edit by hand)
│   └── preload.cjs           # contextBridge → window.asyncShell
├── esbuild.main.mjs          # Builds main process
├── vite.config.ts            # Renderer build
└── package.json
```

## 💾 Persistence (local)

With default paths, app data lives under Electron **`userData`**:

- **`userData/async/threads.json`** — thread list and message history.
- **`userData/async/settings.json`** — models, keys (stored locally), layout, agent options.
- **`userData/.async/plans/`** — saved Plan documents (Markdown) when Plan mode writes a file.

The renderer may use **localStorage** for small UI flags (e.g. agent file-change strip dismiss state); the source of truth for conversations is **`threads.json`**.

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18  
- **npm** ≥ 9  
- **Git** (optional but recommended for built-in Git features)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/async-shell.git
   cd async-shell
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Launch the app**:
   ```bash
   npm run desktop
   ```
   Builds the main bundle and renderer (`dist/`), then starts Electron loading `dist/index.html`.

### Development Mode

Hot reload for the renderer and watch rebuild for the main process:

```bash
npm run dev
```

Optional DevTools:

```bash
npm run dev:debug
```

## 🗺️ Roadmap
- [ ] **Full PTY terminal** (e.g. `node-pty`) for richer shell sessions.
- [ ] **LSP integration** for jump-to-definition and diagnostics in-editor.
- [ ] **Plugin system** for custom tools and agent extensions.
- [ ] **Enhanced context** — RAG or indexing for very large workspaces.

## 📜 License
This project is licensed under the [Apache License 2.0](./LICENSE).
