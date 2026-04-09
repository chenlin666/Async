export type ThreadInfo = {
	id: string;
	title: string;
	updatedAt: number;
	createdAt?: number;
	previewCount: number;
	hasUserMessages?: boolean;
	isToday?: boolean;
	isAwaitingReply?: boolean;
	hasAgentDiff?: boolean;
	additions?: number;
	deletions?: number;
	filePaths?: string[];
	fileCount?: number;
	subtitleFallback?: string;
	tokenUsage?: { totalInput: number; totalOutput: number };
	fileStateCount?: number;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** 列表项引用或 role/content 均相同则视为相等，供 loadMessages 避免无意义的新数组引用 */
export function chatMessagesListEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		const x = a[i]!;
		const y = b[i]!;
		if (x === y) {
			continue;
		}
		if (x.role !== y.role || x.content !== y.content) {
			return false;
		}
	}
	return true;
}

function sameStringList(a: string[] | undefined, b: string[] | undefined): boolean {
	if (a === b) {
		return true;
	}
	const ax = a ?? [];
	const bx = b ?? [];
	if (ax.length !== bx.length) {
		return false;
	}
	for (let i = 0; i < ax.length; i++) {
		if (ax[i] !== bx[i]) {
			return false;
		}
	}
	return true;
}

/** 仅比较侧栏/线程列表真实会消费的字段，避免摘要、diff 统计或标题更新时被误判为相等。 */
export function threadInfoListEqual(a: ThreadInfo[], b: ThreadInfo[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		const x = a[i]!;
		const y = b[i]!;
		if (x === y) {
			continue;
		}
		if (
			x.id !== y.id ||
			x.title !== y.title ||
			x.updatedAt !== y.updatedAt ||
			(x.createdAt ?? 0) !== (y.createdAt ?? 0) ||
			x.previewCount !== y.previewCount ||
			(x.hasUserMessages ?? false) !== (y.hasUserMessages ?? false) ||
			(x.isToday ?? true) !== (y.isToday ?? true) ||
			(x.isAwaitingReply ?? false) !== (y.isAwaitingReply ?? false) ||
			(x.hasAgentDiff ?? false) !== (y.hasAgentDiff ?? false) ||
			(x.additions ?? 0) !== (y.additions ?? 0) ||
			(x.deletions ?? 0) !== (y.deletions ?? 0) ||
			(x.fileCount ?? 0) !== (y.fileCount ?? 0) ||
			(x.subtitleFallback ?? '') !== (y.subtitleFallback ?? '') ||
			(x.fileStateCount ?? 0) !== (y.fileStateCount ?? 0) ||
			(x.tokenUsage?.totalInput ?? 0) !== (y.tokenUsage?.totalInput ?? 0) ||
			(x.tokenUsage?.totalOutput ?? 0) !== (y.tokenUsage?.totalOutput ?? 0) ||
			!sameStringList(x.filePaths, y.filePaths)
		) {
			return false;
		}
	}
	return true;
}

export function normalizeThreadRow(t: ThreadInfo): ThreadInfo {
	return {
		...t,
		hasUserMessages: t.hasUserMessages ?? false,
		isToday: typeof t.isToday === 'boolean' ? t.isToday : true,
		isAwaitingReply: t.isAwaitingReply ?? false,
		hasAgentDiff: t.hasAgentDiff ?? false,
		additions: t.additions ?? 0,
		deletions: t.deletions ?? 0,
		filePaths: t.filePaths ?? [],
		fileCount: t.fileCount ?? 0,
		subtitleFallback: t.subtitleFallback ?? '',
		tokenUsage: t.tokenUsage,
		fileStateCount: t.fileStateCount ?? 0,
	};
}
