# Async Shell

<p align="center">
  <img src="docs/assets/async-logo.svg" width="120" height="120" alt="Async Logo" />
</p>

<p align="center">
  <strong>以 Agent 为中心的 AI IDE Shell。</strong><br>
  为追求精简、自主 Agent 工作流的开发者打造。
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

## 🌟 什么是 Async Shell？

Async Shell 是一款开源的 AI 原生桌面应用，旨在作为你与 AI Agent 交互的核心界面。与传统的 IDE 插件不同，Async 从底层围绕 **Agent 循环 (Agent Loop)** 构建，提供了一个集多模型对话、自主工具执行、代码审阅于一体的统一环境。

### 为什么选择 Async？

- **Agent 优先的工作流**：Agent 不仅仅是一个侧边聊天框，它拥有一等公民权限，可以访问你的工作区、工具和终端。遵循完备的 **自主循环** (思考 -> 规划 -> 执行 -> 观察)。
- **极致的透明度**：实时观察 Agent 的“大脑”运作。支持 **流式工具输入**，在模型生成 JSON 参数时即可同步预览；通过清晰的 **工具执行轨迹** 卡片掌控每一步操作。
- **完全自主可控**：自托管且注重隐私。使用你自己的 OpenAI、Anthropic 或 Gemini API 密钥，代码和对话数据均保留在本地。
- **原生 Git 体验**：内置 Git 服务，支持状态追踪、Diff 预览，并将 Agent 的文件修改与你的仓库状态无缝集成。
- **轻量且高效**：基于 Electron 和 React 构建的高性能桌面外壳，采用简洁的三栏布局，最大化开发效率。

### 📸 界面预览

<p align="center">
  <img src="docs/assets/async-main-screenshot.png" width="1024" alt="Async 主界面" />
</p>

### 📋 Plan 模式

在 **Plan** 模式下，模型会生成结构化计划（标题、任务列表、澄清问题）。你可以在执行前审阅草稿、调整任务。点击 **「开始执行」** 后，Agent 将按照确定的计划自动完成任务。

<p align="center">
  <img src="docs/assets/async-plan-mode.png" width="1024" alt="Async Plan 模式：草稿计划、任务列表与开始执行" />
</p>

## ✨ 核心特性

### 🤖 自主 Agent 循环
- **流式工具输入**：实时观察模型“输入”工具参数的过程，对 Agent 即将执行的操作获得即时反馈。
- **可视化轨迹**：为 `read_file`, `write_to_file`, `str_replace`, `search_files` 和终端命令提供动态卡片展示。
- **Plan 与 Agent 双模式**：
  - **Plan 模式**：模型生成 Markdown 计划，支持任务勾选与人工确认。
  - **Agent 模式**：直接的工具执行循环，适用于快速迭代和自主任务完成。
- **智能上下文**：Agent 修改代码时，编辑器自动定位行号并高亮显示改动范围。

### 🧠 多模型智能
- **原生适配器**：针对 **Anthropic** (支持 Extended Thinking)、**OpenAI** 和 **Gemini** 优化请求路径。
- **模型无关性**：支持任何兼容 OpenAI 接口的 API（如通过 Ollama/vLLM 运行的本地模型）。
- **深度推理支持**：内置对推理模型（Claude 3.7 Thinking, o1 系列）的支持，配备专用的流式思考块展示。

### 🛠️ 专业级开发体验
- **Monaco 编辑器集成**：全功能代码编辑器，支持语法高亮、Diff 视图和多文件管理。
- **Git 感知流**：直接在 UI 中处理 Git 状态、暂存、提交和推送。
- **集成 xterm.js 终端**：专用终端面板，用于运行命令和观察 Agent 驱动的 Shell 行为。
- **增强型输入框 (Composer)**：支持 **@ 提及** 引用文件、多段消息输入及持久化线程管理。

## 🏗️ 技术架构

Async Shell 为稳定性、安全性和性能而设计：

- **主/渲染进程分离**：清晰的 IPC 架构，利用 Electron 的 `contextBridge` 确保安全。
- **流式驱动引擎**：自定义 `agentLoop.ts` 处理多轮工具调用逻辑，支持部分 JSON 解析以实现实时流式反馈。
- **本地优先持久化**：线程历史、配置和计划均以 JSON/Markdown 格式存储在本地用户目录，无需云端同步。
- **Git 服务层**：专用的 Node.js 服务处理底层 Git 操作，确保 UI 与本地仓库状态实时同步。

## 🏗️ 项目结构

```text
async-shell/
├── main-src/                 # 源码 -> 打包至 electron/main.bundle.cjs
│   ├── index.ts              # 应用入口：窗口管理、IPC 注册
│   ├── agent/                # Agent 引擎、工具执行器、工具定义
│   ├── llm/                  # 各厂商适配器与流式处理
│   ├── ipc/register.ts       # IPC 处理函数 (聊天, 线程, Git, 文件系统等)
│   ├── threadStore.ts        # 线程与消息持久化
│   ├── settingsStore.ts      # 设置持久化
│   ├── gitService.ts         # Git 状态与操作服务
│   └── workspace.ts          # 工作区管理与安全路径解析
├── src/                      # Vite + React 渲染进程
│   ├── App.tsx               # 核心布局与状态管理
│   ├── i18n/                 # 国际化文案
│   └── …                     # Agent UI, Monaco, 终端等组件
├── electron/
│   ├── main.bundle.cjs       # 自动生成的主进程产物
│   └── preload.cjs           # 预加载脚本
├── esbuild.main.mjs          # 主进程构建配置
├── vite.config.ts            # 渲染进程构建配置
└── package.json
```

## 💾 数据存储

数据默认存储在 Electron 的 **`userData`** 目录下：

- **`async/threads.json`** — 聊天记录与线程列表。
- **`async/settings.json`** — 模型配置、密钥及应用设置。
- **`.async/plans/`** — 存储 Plan 模式生成的 Markdown 计划文件。

## 🚀 快速开始

### 前置要求
- **Node.js** ≥ 18  
- **npm** ≥ 9  
- **Git** (推荐)

### 安装与运行

1. **克隆仓库**:
   ```bash
   git clone https://github.com/your-org/async-shell.git
   cd async-shell
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **启动应用**:
   ```bash
   npm run desktop
   ```

### 开发模式

```bash
npm run dev
```

## 🗺️ 路线图
- [ ] **完整 PTY 终端** 支持更丰富的 Shell 交互。
- [ ] **LSP 集成** 提供更强的代码跳转和诊断功能。
- [ ] **插件系统** 允许自定义工具和 Agent 扩展。
- [ ] **增强型上下文** 引入 RAG 或索引技术支持超大规模项目。

## 📜 许可证
本项目基于 [Apache License 2.0](./LICENSE) 协议开源。
