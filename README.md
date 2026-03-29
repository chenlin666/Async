# Async

自研 **Electron + Vite + React** 应用，与仓库根目录的 VS Code Workbench **无关**（不加载 `workbench.html`）。

## 桌面版（推荐日常使用）

这是 **Electron 桌面程序**，不是用系统浏览器打开网页。

```bash
npm install
npm run desktop
```

会先完整构建主进程与渲染进程，再启动 **独立桌面窗口**，界面从本地 `dist/index.html` 加载（不依赖 `localhost`）。

## 开发模式（热更新）

```bash
npm run dev
```

- 会启动 **Electron 窗口**（仍是桌面应用），只是在窗口内通过 `http://127.0.0.1:5173` 加载 Vite 开发服务器，便于改 UI 即时刷新。
- **不要**只用浏览器打开 `http://127.0.0.1:5173`：那样没有 preload，会显示「仅浏览器预览」，且不是桌面壳。
- 默认**不再**自动弹出 DevTools；需要调试时在项目目录执行：  
  `npm run dev:debug`（会附带打开开发者工具）。

## 构建产物

```bash
npm run build
```

完成后也可执行 `npm run desktop` 或 `cross-env ASYNC_SHELL_LOAD_DIST=1 electron .`（与 `desktop` 脚本等价）。仍支持旧变量 `VOID_SHELL_LOAD_DIST` / `VOID_SHELL_DEVTOOLS`。

- **esbuild** 将 `main-src/` 打包为 `electron/main.bundle.cjs`（需先执行 `npm run build:main`，`dev` 时会 watch）。
- **preload**：`electron/preload.cjs`（IPC 白名单）。

## 能力（V1）

详见 [docs/V1_SCOPE.md](./docs/V1_SCOPE.md)。

- 三栏：线程 / 对话（OpenAI 兼容流式）/ Git 简表与提交。
- 工作区：选择文件夹；`fs:readFile` / `fs:writeFile`（路径限制在工作区内）。
- 设置：`userData/async/settings.json`（API Key、Base URL、模型名）。若曾使用旧版数据目录 `void-shell`，首次启动会自动复制到 `async`。
- 线程：`userData/async/threads.json`。
- 底部：**Monaco** 编辑、**xterm** 行级 shell 执行。

## 仓库说明

本仓库为 **独立项目**（原从 VS Code 衍生仓中拆出），与 Microsoft / VS Code 主仓无目录嵌套关系。LLM 栈见 `main-src/llm/`；后续若需对齐上游 Void 能力，可按模块自行移植。
