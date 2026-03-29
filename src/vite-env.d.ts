/// <reference types="vite/client" />

export interface AsyncShellAPI {
	invoke(channel: string, ...args: unknown[]): Promise<unknown>;
	subscribeChat(callback: (payload: unknown) => void): () => void;
	/** 主窗口移动/缩放时触发，用于重算 fixed 浮层锚点 */
	subscribeLayout?(callback: () => void): () => void;
}
declare global {
	interface Window {
		asyncShell?: AsyncShellAPI;
	}
}

export {};
