# LSP（语言服务器）分期说明

V1 不内置 LSP 客户端。后续可选方案：

- 在渲染进程使用 `monaco-languageclient` + 独立 `LanguageClient` 连接用户指定的 `stdio` 或 socket 服务（需主进程 spawn 或代理）。
- 与当前 **无 VS Code 扩展** 前提一致：语言服务器由用户或安装包附带，不由 Marketplace 安装。
