import type { ComposerMode } from './composerMode.js';
import type { ModelRequestParadigm } from '../settingsStore.js';

export type StreamHandlers = {
	onDelta: (text: string) => void;
	onDone: (fullText: string) => void;
	onError: (message: string) => void;
};

export type UnifiedChatOptions = {
	mode: ComposerMode;
	signal: AbortSignal;
	requestModelId: string;
	paradigm: ModelRequestParadigm;
	/** 本回合注入系统提示（Rules / Skills / Subagents / 导入规则） */
	agentSystemAppend?: string;
};
