# Async Shell

<p align="center">
  <img src="docs/assets/async-logo-desktop.svg" width="120" height="120" alt="Async Logo" />
</p>

<p align="center">
  <strong>Open-source desktop shell for AI coding: agent workflow, editor, Git, and terminal in one place.</strong><br/>
  Inspired by the workflow popularized by Cursor, but built as an open stack you can inspect, modify, and run with your own model keys.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/like%20Cursor-open%20source-818cf8?style=flat-square" alt="Like Cursor, open source" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Electron-34-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Monaco-0.52-0078D4?style=flat-square" alt="Monaco Editor" />
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

## Why this project exists

Async Shell is an attempt to build a **Cursor-style workflow in the open**: an AI-native desktop environment where the agent, Monaco editor, Git, diff/review flow, and terminal work together in one app. The project is released under **Apache 2.0**, uses **bring-your-own** model keys, and keeps threads, settings, and plans **local-first**.

| Aspect | **Cursor** | **Async Shell** |
| --- | --- | --- |
| **License / delivery** | Proprietary product | **Open source** codebase you can inspect and fork |
| **Model access** | Product billing / built-in integrations | **BYOK** for OpenAI, Anthropic, Gemini, and compatible APIs |
| **Storage model** | Product-managed workflow | **Local-first** threads, settings, and plans |
| **Focus** | Full IDE product | Desktop **shell** centered on agent workflow, editor, Git, and terminal |

---

## What is Async Shell?

Async Shell is an open-source desktop app for working with coding agents. Instead of treating AI as a sidebar chat, it centers the workflow around an **Agent Loop**: chat, tool execution, code edits, and review all happen in the same workspace.

### Why use Async?

- **Agent-first workflow** — the agent can work with your workspace, tools, and terminal through a clear **Think → Plan → Execute → Observe** loop.
- **Visible tool execution** — tool inputs stream live, and **trajectory** cards show what happened for `read_file`, `write_to_file`, `str_replace`, `search_files`, and shell steps.
- **Your keys, your machine** — use your own providers and keep conversations plus repository state local.
- **Git built in** — review status, diffs, and agent-driven changes against the real repository you are editing.
- **Multiple working modes** — switch between **Agent**, **Plan**, **Ask**, and **Debug** depending on how much autonomy or control you want.
- **Lightweight desktop stack** — Electron + React, **Agent** and **Editor** layouts, Monaco, and an embedded terminal in a smaller open codebase.

---

## Screenshots

### Editor layout

<p align="center">
  <img src="docs/assets/workspace_1.png" width="1024" alt="Async Editor layout" />
</p>

### Agent layout

<p align="center">
  <img src="docs/assets/workspace_2.png" width="1024" alt="Async Agent layout" />
</p>

### Plan mode

<p align="center">
  <img src="docs/assets/workspace_3.png" width="1024" alt="Async Plan mode" />
</p>

### Model Settings

<p align="center">
  <img src="docs/assets/setting_1.png" width="720" alt="Async Model Settings" />
</p>

---

## Core Features

### Autonomous Agent Loop

- Live tool parameter streaming and **trajectory** cards.
- **Plan** vs **Agent** mode: review a structured plan first, or run the tool loop directly.
- **Tool approval gate** for shell commands and file writes.
- Editor context sync so agent edits can focus the relevant file and line range.

### Multi-Model Support

- Adapters for **Anthropic** (including extended thinking), **OpenAI**, and **Gemini**.
- Support for OpenAI-compatible APIs such as Ollama, vLLM, aggregators, or custom endpoints.
- Streaming reasoning / "thinking" blocks where supported.
- **Auto** mode to pick the best available model.

### Developer Experience

- **Monaco** editor with tabs, syntax highlighting, and diff review flows.
- **Git** integration for status, diff, staging, commit, and push from the UI.
- **xterm.js** terminal for both user commands and agent shell output.
- **Composer** with **@** file mentions, rich segments, and persistent threads.
- **Quick Open** palette (`Ctrl/Cmd+P`) and keyboard-first navigation.
- Built-in **i18n** support for English and Simplified Chinese.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│  React + Vite  │  Monaco Editor  │  xterm.js Terminal   │
│  Composer / Chat / Plan / Agent UI                       │
└──────────────────────────┬──────────────────────────────┘
                           │  contextBridge (IPC)
┌──────────────────────────▼──────────────────────────────┐
│                     Main Process                         │
│  agentLoop.ts  │  toolExecutor.ts  │  LLM Adapters      │
│  gitService    │  threadStore      │  settingsStore      │
│  workspace     │  LSP session      │  PTY terminal       │
└─────────────────────────────────────────────────────────┘
```

- **Main / renderer IPC** via Electron `contextBridge` and `ipcMain`.
- **`agentLoop.ts`** handles multi-round tool calls, partial JSON streaming, and aborts.
- **Local persistence** stores threads, settings, and plans as JSON / Markdown under user data.
- **`gitService`** provides the Git layer used by the UI for status, diff, staging, commit, and push.
- **LSP** integration uses TypeScript Language Server for in-editor intelligence.

## Project Structure

```text
Async/
├── main-src/                 # Bundled → electron/main.bundle.cjs (Node / Electron main)
│   ├── index.ts              # App entry: windows, userData, IPC registration
│   ├── agent/                # agentLoop.ts, toolExecutor.ts, agentTools.ts, toolApprovalGate.ts
│   ├── llm/                  # OpenAI / Anthropic / Gemini adapters & streaming
│   ├── lsp/                  # TypeScript LSP session
│   ├── ipc/register.ts       # ipcMain handlers (chat, threads, git, fs, agent, …)
│   ├── threadStore.ts        # Persistent threads + messages (JSON)
│   ├── settingsStore.ts      # settings.json
│   ├── gitService.ts         # Porcelain status, diff previews, commit/push
│   └── workspace.ts          # Open-folder root & safe path resolution
├── src/                      # Vite + React renderer
│   ├── App.tsx               # Shell layout, chat, composer modes, Git / explorer
│   ├── i18n/                 # Locale messages (en / zh-CN)
│   ├── AgentActivityGroup.tsx # Cursor-style "Explored N files" collapsible group
│   ├── AgentResultCard.tsx   # Tool result display cards
│   └── …                     # Agent UI, Plan review, Monaco, terminal, …
├── electron/
│   ├── main.bundle.cjs       # esbuild output (do not edit by hand)
│   └── preload.cjs           # contextBridge → window.asyncShell
├── docs/assets/              # Logo, screenshots
├── scripts/
│   └── export-app-icon.mjs   # Rasterize SVG → resources/icons/icon.png
├── esbuild.main.mjs          # Builds main process
├── vite.config.ts            # Renderer build
└── package.json
```

## Local Persistence

Default layout under Electron **`userData`**:

- **`async/threads.json`** — threads and messages.
- **`async/settings.json`** — models, keys (local), layout, agent options.
- **`.async/plans/`** — saved Plan documents (Markdown).

The renderer may use **localStorage** for small UI flags; **`threads.json`** is the source of truth for conversations.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Git** (optional but recommended)

### Install and Run

1. **Clone**:

   ```bash
   git clone https://github.com/ZYKJShadow/Async.git
   cd Async
   ```

2. **Install**:

   ```bash
   npm install
   ```

3. **Build and launch the desktop app**:

   ```bash
   npm run desktop
   ```

   This builds the main and renderer bundles, then opens Electron with `dist/index.html`.

### Development

```bash
npm run dev
```

To open DevTools during development:

```bash
npm run dev:debug
```

### Generate App Icon

```bash
npm run icons
```

This rasterizes `docs/assets/async-logo.svg` into `resources/icons/icon.png` (256x256) and `public/favicon.png`.

---

## Roadmap

- [ ] Full **PTY** terminal support for a better interactive shell experience.
- [ ] Deeper **LSP** integration: go-to-definition, diagnostics, and hover.
- [ ] A **plugin / tool** extension API.
- [ ] Better large-workspace context through indexing and retrieval.
- [ ] **MCP** (Model Context Protocol) tool integration.

---

## Community

Questions, ideas, and feedback are welcome.

- **Forum**: [linux.do](https://linux.do/) — join the discussion, share your setup, report issues.

---

## License

Licensed under the [Apache License 2.0](./LICENSE).
