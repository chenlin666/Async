# Async V1 产品范围

本文档锁定自研 Electron 壳（仓库内 `void-shell` / `async-shell` 包）第一版能力边界，与 Microsoft VS Code 扩展体系**解耦**。

## 明确不做

- 安装或兼容任意 **VS Code / Open VSX 扩展**；无 Extension Host。
- 内置 **VS Code Workbench**（侧栏、活动栏、内置 SCM 视图等）。
- VS Code **设置同步、遥测管道、Marketplace** 等产品链路。

## V1 必须交付

- **三栏 UI**：Agent 线程轨、命令中心（对话 + 流式输出）、变更/Git 面板。
- **主进程 LLM**：OpenAI 兼容 API（含自定义 `baseURL`）流式对话；可配置 API Key 与模型名（`settings.json` 存于 userData）。
- **线程与消息**：创建/切换线程、持久化到 userData；中止生成。
- **工作区**：选择文件夹；受限的读/写文件 IPC（路径必须在工作区内）。
- **Git**：`status`（简表）、分支名、暂存/提交（调用 `git`，路径校验）。
- **Monaco**：在壳内编辑当前工作区文件（打开、保存）。

## 可选 / 分期

- **终端**：xterm 界面 + 行级命令执行（非完整 PTY）；完整 `node-pty` 可后续加入。
- **LSP**：不在 V1 实现；仅保留与 Monaco 集成的扩展点说明（见 `docs/LSP_NOTES.md`）。
- **多窗口**：单窗口为主；多窗口策略在 `main-src/index.ts` 中预留。

## 更新通道

- 占位：后续自有更新 URL 与校验逻辑，不沿用 VS Code 更新服务。
