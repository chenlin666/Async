import type { ComposerMode } from './ComposerPlusMenu';

/** Agent 审阅：主进程解析出的待应用 unified diff 块 */
export type AgentPendingPatch = {
	id: string;
	chunk: string;
	relPath: string | null;
};

export type ChatStreamPayload =
	| { threadId: string; type: 'delta'; text: string }
	| { threadId: string; type: 'done'; text: string; pendingAgentPatches?: AgentPendingPatch[] }
	| { threadId: string; type: 'error'; message: string }
	| { threadId: string; type: 'tool_call'; name: string; args: string }
	| { threadId: string; type: 'tool_result'; name: string; result: string; success: boolean };

/** `chat:send` IPC 载荷（与主进程一致） */
export type ChatSendPayload = {
	threadId: string;
	text: string;
	mode?: ComposerMode;
	/** `auto` 或用户模型条目 id */
	modelId?: string;
};

/** `plan:save` IPC 载荷 */
export type PlanSavePayload = {
	filename: string;
	content: string;
};

/** `plan:save` IPC 返回值 */
export type PlanSaveResult = {
	ok: boolean;
	path?: string;
	error?: string;
};
