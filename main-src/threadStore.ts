import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveAsyncDataDir } from './dataDir.js';

export type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

export type ThreadRecord = {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
};

type StoreFile = {
	currentThreadId: string | null;
	threads: Record<string, ThreadRecord>;
};

let storePath = '';
let data: StoreFile = { currentThreadId: null, threads: {} };

export function initThreadStore(userData: string): void {
	const dir = resolveAsyncDataDir(userData);
	fs.mkdirSync(dir, { recursive: true });
	storePath = path.join(dir, 'threads.json');
	load();
}

function load(): void {
	if (!fs.existsSync(storePath)) {
		data = { currentThreadId: null, threads: {} };
		save();
		return;
	}
	try {
		const raw = fs.readFileSync(storePath, 'utf8');
		data = JSON.parse(raw) as StoreFile;
		if (!data.threads) {
			data.threads = {};
		}
	} catch {
		data = { currentThreadId: null, threads: {} };
	}
}

/** Call after load + before serving IPC. */
export function ensureDefaultThread(): void {
	if (Object.keys(data.threads).length === 0) {
		createThread();
		return;
	}
	if (!data.currentThreadId || !data.threads[data.currentThreadId]) {
		data.currentThreadId = Object.keys(data.threads)[0] ?? null;
		save();
	}
}

function save(): void {
	fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}

export function listThreads(): ThreadRecord[] {
	return Object.values(data.threads).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCurrentThreadId(): string | null {
	return data.currentThreadId;
}

export function getThread(id: string): ThreadRecord | undefined {
	return data.threads[id];
}

export function createThread(): ThreadRecord {
	const id = randomUUID();
	const now = Date.now();
	const t: ThreadRecord = {
		id,
		title: '新会话',
		createdAt: now,
		updatedAt: now,
		messages: [
			{
				role: 'system',
				content:
					'You are Async, a concise coding assistant. Use markdown for code. The user workspace is open in the app.',
			},
		],
	};
	data.threads[id] = t;
	data.currentThreadId = id;
	save();
	return t;
}

export function selectThread(id: string): ThreadRecord | null {
	if (!data.threads[id]) {
		return null;
	}
	data.currentThreadId = id;
	save();
	return data.threads[id];
}

export function deleteThread(id: string): void {
	delete data.threads[id];
	if (data.currentThreadId === id) {
		const ids = Object.keys(data.threads);
		data.currentThreadId = ids[0] ?? null;
	}
	save();
}

const MAX_THREAD_TITLE_LEN = 200;

/** 手动重命名对话标题（非空、去首尾空白） */
export function setThreadTitle(id: string, title: string): boolean {
	const t = data.threads[id];
	if (!t) {
		return false;
	}
	const trimmed = title.trim().slice(0, MAX_THREAD_TITLE_LEN);
	if (!trimmed) {
		return false;
	}
	t.title = trimmed;
	t.updatedAt = Date.now();
	save();
	return true;
}

export function appendMessage(threadId: string, msg: ChatMessage): ThreadRecord {
	const t = data.threads[threadId];
	if (!t) {
		throw new Error('Thread not found');
	}
	t.messages.push(msg);
	t.updatedAt = Date.now();
	if (msg.role === 'user' && t.messages.filter((m) => m.role === 'user').length === 1) {
		t.title = msg.content.slice(0, 48) + (msg.content.length > 48 ? '…' : '');
	}
	save();
	return t;
}

export function updateLastAssistant(threadId: string, fullContent: string): void {
	const t = data.threads[threadId];
	if (!t) {
		return;
	}
	const last = t.messages[t.messages.length - 1];
	if (last && last.role === 'assistant') {
		last.content = fullContent;
	} else {
		t.messages.push({ role: 'assistant', content: fullContent });
	}
	t.updatedAt = Date.now();
	save();
}

/** 在末尾助手气泡后追加文本（用于 Agent 审阅通过后写入脚注）。 */
export function appendToLastAssistant(threadId: string, suffix: string): void {
	const t = data.threads[threadId];
	if (!t || !suffix) {
		return;
	}
	const last = t.messages[t.messages.length - 1];
	if (last?.role === 'assistant') {
		last.content += suffix;
		t.updatedAt = Date.now();
		save();
	}
}

/**
 * 从「非 system 消息列表」中的第 visibleIndex 条用户消息起截断（含该条），再追加新的用户消息。
 * visibleIndex 与 IPC threads:messages 返回顺序一致。
 */
export function replaceFromUserVisibleIndex(
	threadId: string,
	visibleIndex: number,
	newUserContent: string
): ThreadRecord {
	const t = data.threads[threadId];
	if (!t) {
		throw new Error('Thread not found');
	}
	const system = t.messages.filter((m) => m.role === 'system');
	const rest = t.messages.filter((m) => m.role !== 'system');
	if (
		visibleIndex < 0 ||
		visibleIndex >= rest.length ||
		rest[visibleIndex]!.role !== 'user'
	) {
		throw new Error('Invalid user message index');
	}
	const kept = rest.slice(0, visibleIndex);
	t.messages = [...system, ...kept, { role: 'user', content: newUserContent }];
	t.updatedAt = Date.now();
	if (visibleIndex === 0) {
		t.title = newUserContent.slice(0, 48) + (newUserContent.length > 48 ? '…' : '');
	}
	save();
	return t;
}
