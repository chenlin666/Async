import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../threadTypes';
import type { ChatStreamPayload, TeamRoleScope, TurnTokenUsage } from '../ipcTypes';

export type TeamSessionPhase = 'planning' | 'executing' | 'reviewing' | 'delivering';
export type TeamTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'revision';
export type TeamRoleType = 'team_lead' | 'frontend' | 'backend' | 'qa' | 'reviewer' | 'custom';

export type TeamTask = {
	id: string;
	expertId: string;
	expertAssignmentKey?: string;
	expertName: string;
	roleType: TeamRoleType;
	description: string;
	status: TeamTaskStatus;
	dependencies: string[];
	acceptanceCriteria?: string[];
	result?: string;
	logs: string[];
};

export type TeamRoleWorkflowState = {
	taskId: string;
	expertId: string;
	expertName: string;
	roleType: TeamRoleType;
	roleKind: 'specialist' | 'reviewer';
	/** @deprecated 后端不再发送 delta 到渲染器，保留字段兼容类型引用 */
	streaming: string;
	/** @deprecated */
	streamingThinking: string;
	messages: ChatMessage[];
	lastTurnUsage: TurnTokenUsage | null;
	awaitingReply: boolean;
	lastUpdatedAt: number;
};

export type TeamSessionState = {
	phase: TeamSessionPhase;
	tasks: TeamTask[];
	planSummary: string;
	reviewSummary: string;
	reviewVerdict: 'approved' | 'revision_needed' | null;
	selectedTaskId: string | null;
	reviewerTaskId: string | null;
	roleWorkflowByTaskId: Record<string, TeamRoleWorkflowState>;
	updatedAt: number;
};

function emptySession(): TeamSessionState {
	return {
		phase: 'planning',
		tasks: [],
		planSummary: '',
		reviewSummary: '',
		reviewVerdict: null,
		selectedTaskId: null,
		reviewerTaskId: null,
		roleWorkflowByTaskId: {},
		updatedAt: Date.now(),
	};
}

const MAX_TASK_LOGS = 50;
const FLUSH_INTERVAL_MS = 1000;

function ensureRoleWorkflow(
	roleWorkflowByTaskId: Record<string, TeamRoleWorkflowState>,
	scope: TeamRoleScope
): TeamRoleWorkflowState {
	const current = roleWorkflowByTaskId[scope.teamTaskId];
	if (current) {
		current.expertId = scope.teamExpertId;
		current.expertName = scope.teamExpertName;
		current.roleType = scope.teamRoleType;
		current.roleKind = scope.teamRoleKind;
		return current;
	}
	const wf: TeamRoleWorkflowState = {
		taskId: scope.teamTaskId,
		expertId: scope.teamExpertId,
		expertName: scope.teamExpertName,
		roleType: scope.teamRoleType,
		roleKind: scope.teamRoleKind,
		streaming: '',
		streamingThinking: '',
		messages: [],
		lastTurnUsage: null,
		awaitingReply: true,
		lastUpdatedAt: Date.now(),
	};
	roleWorkflowByTaskId[scope.teamTaskId] = wf;
	return wf;
}

/**
 * 直接 mutate roleWorkflow（在 ref 中），返回是否需要立即刷新 UI。
 *
 * 参考 Claude Code coordinator 模式：specialist 的 token 流不推入 React state，
 * 只在 done/error 时携带完整文本一次性更新。前端仅通过 task 级别的状态事件
 * （expert_started/expert_done）来驱动 UI，避免高频渲染。
 */
function mutateRoleWorkflowPayload(
	session: TeamSessionState,
	payload: ChatStreamPayload,
	scope: TeamRoleScope
): boolean {
	const wf = ensureRoleWorkflow(session.roleWorkflowByTaskId, scope);
	if (!session.selectedTaskId) {
		session.selectedTaskId = scope.teamTaskId;
	}
	if (scope.teamRoleKind === 'reviewer') {
		session.reviewerTaskId = scope.teamTaskId;
	}

	if (payload.type === 'done') {
		const msg: ChatMessage = { role: 'assistant', content: payload.text };
		const lastMsg = wf.messages[wf.messages.length - 1];
		if (!(lastMsg?.role === msg.role && lastMsg?.content === msg.content)) {
			wf.messages = [...wf.messages, msg];
		}
		wf.streaming = '';
		wf.streamingThinking = '';
		wf.lastTurnUsage = payload.usage ?? wf.lastTurnUsage;
		wf.awaitingReply = false;
		return true;
	}

	if (payload.type === 'error') {
		const errMsg: ChatMessage = { role: 'assistant', content: `Error: ${payload.message}` };
		const lastErrMsg = wf.messages[wf.messages.length - 1];
		if (!(lastErrMsg?.role === errMsg.role && lastErrMsg?.content === errMsg.content)) {
			wf.messages = [...wf.messages, errMsg];
		}
		wf.streaming = '';
		wf.streamingThinking = '';
		wf.awaitingReply = false;
		return true;
	}

	// 其余事件（delta / thinking_delta / tool_* 等）后端已不再发送给渲染器
	return false;
}

function upsertTask(tasks: TeamTask[], next: TeamTask): TeamTask[] {
	const idx = tasks.findIndex((t) => t.id === next.id);
	if (idx < 0) {
		return [...tasks, next];
	}
	const copy = [...tasks];
	copy[idx] = { ...copy[idx]!, ...next };
	return copy;
}

function clampLogs(logs: string[], entry: string): string[] {
	if (!entry) return logs;
	if (logs.length >= MAX_TASK_LOGS) {
		const next = logs.slice(-(MAX_TASK_LOGS - 1));
		next.push(entry);
		return next;
	}
	return [...logs, entry];
}

/** 浅拷贝 session 快照到 React state（不含 liveBlocks，非常轻量） */
function snapshotSession(session: TeamSessionState): TeamSessionState {
	const rwCopy: Record<string, TeamRoleWorkflowState> = {};
	for (const [k, v] of Object.entries(session.roleWorkflowByTaskId)) {
		rwCopy[k] = { ...v };
	}
	return {
		...session,
		tasks: session.tasks.map((t) => ({ ...t })),
		roleWorkflowByTaskId: rwCopy,
	};
}

export function useTeamSession() {
	const [sessionsByThread, setSessionsByThread] = useState<Record<string, TeamSessionState>>({});

	const sessionsRef = useRef<Record<string, TeamSessionState>>({});
	const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dirtyThreadsRef = useRef<Set<string>>(new Set());

	const flushDirty = useCallback(() => {
		flushTimerRef.current = null;
		const dirty = dirtyThreadsRef.current;
		if (dirty.size === 0) return;
		const threadIds = [...dirty];
		dirty.clear();
		setSessionsByThread((prev) => {
			const next = { ...prev };
			for (const tid of threadIds) {
				const live = sessionsRef.current[tid];
				if (live) {
					next[tid] = snapshotSession(live);
				} else {
					delete next[tid];
				}
			}
			return next;
		});
	}, []);

	const scheduleFlush = useCallback((threadId: string, immediate: boolean) => {
		dirtyThreadsRef.current.add(threadId);
		if (immediate) {
			if (flushTimerRef.current) {
				clearTimeout(flushTimerRef.current);
				flushTimerRef.current = null;
			}
			flushDirty();
		} else if (!flushTimerRef.current) {
			flushTimerRef.current = setTimeout(flushDirty, FLUSH_INTERVAL_MS);
		}
	}, [flushDirty]);

	useEffect(() => {
		return () => {
			if (flushTimerRef.current) {
				clearTimeout(flushTimerRef.current);
				flushTimerRef.current = null;
			}
		};
	}, []);

	const applyTeamPayload = useCallback((payload: ChatStreamPayload) => {
		if (!payload.threadId) return;
		const threadId = payload.threadId;

		if (!sessionsRef.current[threadId]) {
			sessionsRef.current[threadId] = emptySession();
		}
		const session = sessionsRef.current[threadId]!;

		if (payload.teamRoleScope) {
			const needFlush = mutateRoleWorkflowPayload(session, payload, payload.teamRoleScope);
			session.updatedAt = Date.now();
			scheduleFlush(threadId, needFlush);
			return;
		}

		if (!String(payload.type).startsWith('team_')) return;

		let needFlush = true;
		switch (payload.type) {
			case 'team_phase':
				session.phase = payload.phase;
				break;
			case 'team_task_created': {
				const created: TeamTask = {
					id: payload.task.id,
					expertId: payload.task.expertId,
					expertAssignmentKey: payload.task.expertAssignmentKey,
					expertName: payload.task.expertName,
					roleType: payload.task.roleType,
					description: payload.task.description,
					status: payload.task.status,
					dependencies: payload.task.dependencies ?? [],
					acceptanceCriteria: payload.task.acceptanceCriteria ?? [],
					logs: [],
				};
				session.tasks = upsertTask(session.tasks, created);
				if (!session.selectedTaskId) session.selectedTaskId = created.id;
				break;
			}
			case 'team_expert_started': {
				if (!session.selectedTaskId) session.selectedTaskId = payload.taskId;
				const t = session.tasks.find((x) => x.id === payload.taskId);
				if (t) {
					t.status = 'in_progress';
					t.logs = clampLogs(t.logs, 'Started');
				}
				break;
			}
			case 'team_expert_progress': {
				const detail = payload.message ?? payload.delta ?? '';
				const t = session.tasks.find((x) => x.id === payload.taskId);
				if (t && detail) {
					t.logs = clampLogs(t.logs, detail);
				}
				needFlush = false;
				break;
			}
			case 'team_expert_done': {
				const t = session.tasks.find((x) => x.id === payload.taskId);
				if (t) {
					t.status = payload.success ? 'completed' : 'failed';
					t.result = payload.result;
					if (payload.result) t.logs = clampLogs(t.logs, payload.result);
				}
				break;
			}
			case 'team_plan_summary':
				session.planSummary = payload.summary;
				break;
			case 'team_review':
				session.reviewVerdict = payload.verdict;
				session.reviewSummary = payload.summary;
				break;
			default:
				return;
		}
		session.updatedAt = Date.now();
		scheduleFlush(threadId, needFlush);
	}, [scheduleFlush]);

	const setSelectedTask = useCallback((threadId: string, taskId: string | null) => {
		const session = sessionsRef.current[threadId];
		if (session) {
			session.selectedTaskId = taskId;
			session.updatedAt = Date.now();
		}
		setSessionsByThread((prev) => {
			const cur = prev[threadId] ?? emptySession();
			return {
				...prev,
				[threadId]: { ...cur, selectedTaskId: taskId, updatedAt: Date.now() },
			};
		});
	}, []);

	const abortTeamSession = useCallback((threadId: string) => {
		const session = sessionsRef.current[threadId];
		if (!session) return;
		let changed = false;
		for (const task of session.tasks) {
			if (task.status === 'in_progress' || task.status === 'pending') {
				task.status = 'failed';
				if (!task.result) task.result = 'Aborted by user.';
				changed = true;
			}
		}
		for (const wf of Object.values(session.roleWorkflowByTaskId)) {
			if (wf.awaitingReply) {
				wf.awaitingReply = false;
				wf.streaming = '';
				wf.streamingThinking = '';
				changed = true;
			}
		}
		if (changed) {
			session.updatedAt = Date.now();
			scheduleFlush(threadId, true);
		}
	}, [scheduleFlush]);

	const clearTeamSession = useCallback((threadId: string) => {
		if (flushTimerRef.current) {
			clearTimeout(flushTimerRef.current);
			flushTimerRef.current = null;
		}
		dirtyThreadsRef.current.delete(threadId);
		delete sessionsRef.current[threadId];
		setSessionsByThread((prev) => {
			if (!prev[threadId]) return prev;
			const next = { ...prev };
			delete next[threadId];
			return next;
		});
	}, []);

	const getTeamSession = useCallback(
		(threadId: string | null): TeamSessionState | null => {
			if (!threadId) return null;
			return sessionsByThread[threadId] ?? null;
		},
		[sessionsByThread]
	);

	return useMemo(
		() => ({
			sessionsByThread,
			applyTeamPayload,
			setSelectedTask,
			clearTeamSession,
			abortTeamSession,
			getTeamSession,
		}),
		[sessionsByThread, applyTeamPayload, setSelectedTask, clearTeamSession, abortTeamSession, getTeamSession]
	);
}
