import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GitPathStatusMap } from '../WorkspaceExplorer';

type Shell = NonNullable<Window['asyncShell']>;
type DiffPreview = { diff: string; isBinary: boolean; additions: number; deletions: number };
const AUTO_DIFF_PREVIEW_MAX_PATHS = 120;

type FullStatusOk = {
	ok: true;
	branch: string;
	lines: string[];
	pathStatus: GitPathStatusMap;
	changedPaths: string[];
	branches?: string[];
	current?: string;
};

type FullStatusFail = { ok: false; error?: string };

/**
 * 管理所有 Git 相关状态：分支、状态、diff 预览、分支列表。
 * 在 workspace 变化或文件系统触碰时自动刷新。
 * diff 对比（git:diffPreviews）仅在用户进入源代码管理视图时由 loadGitDiffPreviews 触发，避免切换工作区时阻塞 UI。
 */
export function useGitIntegration(shell: Shell | undefined, workspace: string | null) {
	const [gitBranch, setGitBranch] = useState('—');
	const [gitLines, setGitLines] = useState<string[]>([]);
	const [gitPathStatus, setGitPathStatus] = useState<GitPathStatusMap>({});
	const [gitChangedPaths, setGitChangedPaths] = useState<string[]>([]);
	/** `git:status` 成功（有仓库且本机可执行 git）；否则 Agent 改动条回退为对话解析统计 */
	const [gitStatusOk, setGitStatusOk] = useState(false);
	/** 与 refreshGit 同步预取的本地分支列表（供分支选择器立即展示） */
	const [gitBranchList, setGitBranchList] = useState<string[]>([]);
	const [gitBranchListCurrent, setGitBranchListCurrent] = useState('');
	const [diffPreviews, setDiffPreviews] = useState<Record<string, DiffPreview>>({});
	const [diffLoading, setDiffLoading] = useState(false);
	const [gitActionError, setGitActionError] = useState<string | null>(null);
	const [treeEpoch, setTreeEpoch] = useState(0);
	const [gitBranchPickerOpen, setGitBranchPickerOpen] = useState(false);

	const diffPreviewsGenRef = useRef(0);
	const gitChangedPathsRef = useRef<string[]>([]);
	gitChangedPathsRef.current = gitChangedPaths;

	const refreshGit = useCallback(async () => {
		if (!shell) {
			return;
		}
		diffPreviewsGenRef.current += 1;
		setDiffLoading(false);
		const dev = import.meta.env.DEV;
		const t0 = dev && typeof performance !== 'undefined' ? performance.now() : 0;
		const r = (await shell.invoke('git:fullStatus')) as FullStatusOk | FullStatusFail;
		if (dev && t0) {
			console.log(`[perf][git] refreshGit: fullStatus ipc=${(performance.now() - t0).toFixed(1)}ms`);
		}
		if (r.ok) {
			if (dev) {
				console.log(
					`[perf][git] refreshGit: ok changed=${(r.changedPaths ?? []).length}, pathStatus=${Object.keys(r.pathStatus ?? {}).length}`
				);
			}
			setGitStatusOk(true);
			setGitBranch(r.branch || 'master');
			// 避免把大仓库完整 porcelain 行灌进 React 状态；可用信息由 changedPaths/pathStatus 承载。
			setGitLines([]);
			setGitPathStatus(r.pathStatus ?? {});
			setGitChangedPaths(r.changedPaths ?? []);
			setGitBranchList(Array.isArray(r.branches) ? r.branches : []);
			setGitBranchListCurrent(typeof r.current === 'string' ? r.current : '');
			setDiffPreviews({});
		} else {
			if (dev) {
				console.warn(`[perf][git] refreshGit: failed ${r.error ?? 'unknown error'}`);
			}
			setGitStatusOk(false);
			setGitBranch('—');
			setGitLines([r.error ?? 'Failed to load changes']);
			setGitPathStatus({});
			setGitChangedPaths([]);
			setGitBranchList([]);
			setGitBranchListCurrent('');
			setDiffPreviews({});
		}
		setTreeEpoch((n) => n + 1);
	}, [shell]);

	const loadGitDiffPreviews = useCallback(async () => {
		if (!shell) {
			return;
		}
		const paths = gitChangedPathsRef.current;
		if (paths.length === 0) {
			setDiffPreviews({});
			setDiffLoading(false);
			return;
		}
		if (paths.length > AUTO_DIFF_PREVIEW_MAX_PATHS) {
			if (import.meta.env.DEV) {
				console.log(
					`[perf][git] diffPreviews skipped (manual): changed=${paths.length} > max=${AUTO_DIFF_PREVIEW_MAX_PATHS}`
				);
			}
			setDiffPreviews({});
			setDiffLoading(false);
			return;
		}
		const gen = ++diffPreviewsGenRef.current;
		setDiffLoading(true);
		await new Promise<void>((resolve) => {
			const idle =
				window.requestIdleCallback ??
				((cb: IdleRequestCallback) =>
					window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 } as IdleDeadline), 1));
			idle(
				() => {
					void (async () => {
						const t0 = import.meta.env.DEV && typeof performance !== 'undefined' ? performance.now() : 0;
						if (import.meta.env.DEV) {
							console.log(`[perf][git] diffPreviews start (scm): paths=${paths.length}, gen=${gen}`);
						}
						try {
							const r = (await shell.invoke('git:diffPreviews', paths)) as
								| { ok: true; previews: Record<string, DiffPreview> }
								| { ok: false };
							if (import.meta.env.DEV && t0) {
								console.log(`[perf][git] diffPreviews ipc=${(performance.now() - t0).toFixed(1)}ms, gen=${gen}`);
							}
							if (gen === diffPreviewsGenRef.current && r.ok) {
								if (import.meta.env.DEV) {
									console.log(
										`[perf][git] diffPreviews apply: keys=${Object.keys(r.previews ?? {}).length}, gen=${gen}`
									);
								}
								setDiffPreviews(r.previews);
							} else if (import.meta.env.DEV) {
								console.log(
									`[perf][git] diffPreviews dropped: gen=${gen} currentGen=${diffPreviewsGenRef.current} ok=${(r as { ok?: unknown }).ok === true}`
								);
							}
						} finally {
							if (gen === diffPreviewsGenRef.current) {
								setDiffLoading(false);
							}
							resolve();
						}
					})();
				},
				{ timeout: 1800 }
			);
		});
	}, [shell]);

	const onGitBranchListFresh = useCallback((b: string[], c: string) => {
		setGitBranchList(b);
		setGitBranchListCurrent(c);
	}, []);

	// workspace 变化时刷新 git 状态
	useEffect(() => {
		if (!workspace || !shell) {
			return;
		}
		if (import.meta.env.DEV) {
			console.log(`[perf][git] workspace changed -> refreshGit: ${workspace}`);
		}
		void refreshGit();
	}, [workspace, shell, refreshGit]);

	// 注意：已移除文件系统变化时的自动刷新
	// Git 状态现在只在以下场景刷新：
	// 1. workspace 变化时
	// 2. 用户打开源代码管理视图时（由组件手动调用 refreshGit + loadGitDiffPreviews）
	// 3. AI 修改代码后（agent review/commit/revert 等操作）
	// 这样可以避免高频的文件系统事件导致不必要的 Git 命令执行
	// diff 预览（git:diffPreviews）不再随 changedPaths 自动拉取，见 loadGitDiffPreviews。

	const diffTotals = useMemo(() => {
		let additions = 0,
			deletions = 0;
		for (const p of gitChangedPaths) {
			const pr = diffPreviews[p];
			if (pr) {
				additions += pr.additions;
				deletions += pr.deletions;
			}
		}
		return { additions, deletions };
	}, [gitChangedPaths, diffPreviews]);

	return {
		gitBranch,
		gitLines,
		gitPathStatus,
		gitChangedPaths,
		gitStatusOk,
		gitBranchList,
		gitBranchListCurrent,
		diffPreviews,
		diffLoading,
		gitActionError,
		setGitActionError,
		treeEpoch,
		gitBranchPickerOpen,
		setGitBranchPickerOpen,
		diffTotals,
		refreshGit,
		loadGitDiffPreviews,
		onGitBranchListFresh,
	};
}
