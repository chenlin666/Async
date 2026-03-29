# AI Editor Architecture Reference

## Prompt Assembly

Prompt assembly combines system instructions, context snippets, and user input
into the final LLM prompt.

### Key design decisions

- **Template engine**: Use a simple tagged-template or mustache-style system.
  Avoid heavy templating libraries.
- **Context budget**: Track token counts per section. Prioritize: system
  instructions > selected code > current file > related files > project index.
- **Ordered sections**: System prompt → context blocks → conversation history →
  user message.

### Typical interface

```typescript
interface PromptSection {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokenCount: number;
  priority: number; // higher = less likely to be truncated
}

function assemblePrompt(
  sections: PromptSection[],
  maxTokens: number
): PromptSection[];
```

---

## Context Retrieval

### Levels of context

| Level | Source | When to use |
|-------|--------|-------------|
| Selection | Editor selection | Inline edit, explain, refactor |
| File | Current buffer | Chat, completion |
| Symbol | LSP definitions, references | Go-to-definition context |
| Project | File index, embeddings | Broad questions, agent mode |

### Implementation strategies

- **File index**: Walk workspace files on startup; watch for changes via
  `fs.watch` / `chokidar`. Store path, size, last modified.
- **Symbol index**: Use Tree-sitter or LSP to extract function/class
  definitions. Store as `{name, kind, file, range}`.
- **Embedding index**: Chunk files into ~500-token blocks, embed with a small
  model, store in a local vector DB (e.g. SQLite with `sqlite-vss`).
- **Incremental updates**: Re-index only changed files. Use file hash or mtime
  to detect changes.

---

## Diff-based Editing

### Patch format

Use unified diff format for human readability and tooling compatibility.

### Workflow

1. LLM generates a diff (or full replacement block).
2. Parse diff into structured hunks: `{file, startLine, removedLines, addedLines}`.
3. Show diff preview to user (side-by-side or inline).
4. On accept → apply patch. On reject → discard.
5. Store original content for rollback.

### Rollback strategy

- Keep an undo stack per file: `Map<filePath, ContentSnapshot[]>`.
- Each snapshot stores the content before the patch was applied.
- Provide "undo last AI edit" command.

---

## Agent Loop

### Core cycle

```
Plan → Execute → Observe → Re-plan
```

### Implementation

```typescript
interface AgentStep {
  thought: string;
  action: ToolCall;
  observation: string;
}

async function agentLoop(task: string, tools: Tool[], maxSteps: number) {
  const history: AgentStep[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const plan = await llm.plan(task, history);
    if (plan.done) return plan.result;
    const observation = await executeTool(plan.action);
    history.push({ thought: plan.thought, action: plan.action, observation });
  }
}
```

### Tool definitions

Common tools for an editor agent:

| Tool | Description |
|------|-------------|
| `readFile` | Read file contents |
| `writeFile` | Write or create a file |
| `searchFiles` | Grep / ripgrep across workspace |
| `listFiles` | List directory contents |
| `runTerminal` | Execute a shell command |
| `applyDiff` | Apply a unified diff to a file |
| `getSymbols` | Get symbol definitions from LSP |

---

## Model Routing

### Routing criteria

| Factor | Fast model | Strong model |
|--------|-----------|--------------|
| Task complexity | Simple completion, formatting | Architecture, multi-file refactor |
| Latency requirement | < 500ms (completion) | Acceptable > 2s (chat, agent) |
| Token budget | Small context | Large context |
| Cost sensitivity | High-frequency calls | Low-frequency calls |

### Implementation

```typescript
interface ModelConfig {
  id: string;
  provider: string;
  maxTokens: number;
  costPer1kTokens: number;
  latencyMs: number;
}

function selectModel(task: TaskType, urgency: 'low' | 'high'): ModelConfig;
```

---

## Streaming & Performance

### Streaming responses

- Use SSE or WebSocket for streaming LLM output to the UI.
- Render tokens incrementally; don't wait for the full response.
- For inline completion: show ghost text that updates as tokens arrive.

### Caching

- Cache file reads within a request cycle.
- Cache embeddings; invalidate on file change.
- Cache symbol index; rebuild incrementally.

### Lazy loading

- Don't index the entire workspace on startup. Index open files first, then
  expand in the background.
- Load extension/plugin code on demand.

---

## Safety & UX

### Change scope control

- Show a diff preview before applying any AI-generated edit.
- Require explicit user confirmation for multi-file changes.
- Provide a "reject all" option.

### Keyboard shortcuts (recommended defaults)

| Action | Shortcut |
|--------|----------|
| Open AI chat | `Ctrl+L` |
| Inline edit | `Ctrl+K` |
| Accept suggestion | `Tab` |
| Reject suggestion | `Escape` |
| Toggle agent panel | `Ctrl+Shift+A` |
| Undo AI edit | `Ctrl+Shift+Z` |

### Command palette integration

Register AI commands in the command palette:
- "AI: Explain selection"
- "AI: Refactor selection"
- "AI: Generate tests"
- "AI: Fix errors"
- "AI: Ask about codebase"
