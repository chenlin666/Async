import type { MutableRefObject } from 'react';
import type { ComposerMode } from './ComposerPlusMenu';
import {
	collectFileChanges,
	segmentAssistantContentUnified,
	type FileChangeSummary,
} from './agentChatSegments';
import { mergeAgentFileChangesWithGit, type DiffPreviewStats } from './agentFileChangesFromGit';
import type { TFunction } from './i18n';
import type { ChatMessage } from './threadTypes';

export type GitMergePack = {
	gitStatusOk: boolean;
	gitChangedPaths: string[];
	diffPreviews: Record<string, DiffPreviewStats>;
};

type SegmentCache = MutableRefObject<{
	content: string;
	result: ReturnType<typeof segmentAssistantContentUnified>;
} | null>;

/**
 * 底部「Agent 改动文件」条：解析最后一条助手消息并与 Git 合并。
 * 供 AgentChatPanel 内计算（避免 Git 更新时拖垮 useAgentChatPanelProps），
 * 以及 onRevertAllEdits 在点击时取路径快照（segmentCacheRef 传 null 即可）。
 */
export function computeMergedAgentFileChanges(
	displayMessages: ChatMessage[],
	composerMode: ComposerMode,
	t: TFunction,
	dismissedFiles: ReadonlySet<string>,
	git: GitMergePack,
	segmentCacheRef: SegmentCache | null
): FileChangeSummary[] {
	if (composerMode !== 'agent') {
		return [];
	}
	const lastAssistant = [...displayMessages].reverse().find((m) => m.role === 'assistant');
	if (!lastAssistant) {
		return [];
	}
	let segs: ReturnType<typeof segmentAssistantContentUnified>;
	if (segmentCacheRef?.current?.content === lastAssistant.content) {
		segs = segmentCacheRef.current.result;
	} else {
		segs = segmentAssistantContentUnified(lastAssistant.content, { t });
		if (segmentCacheRef) {
			segmentCacheRef.current = { content: lastAssistant.content, result: segs };
		}
	}
	const all = collectFileChanges(segs);
	const afterDismiss =
		dismissedFiles.size > 0 ? all.filter((f) => !dismissedFiles.has(f.path)) : all;
	return mergeAgentFileChangesWithGit(afterDismiss, {
		gitStatusOk: git.gitStatusOk,
		gitChangedPaths: git.gitChangedPaths,
		diffPreviews: git.diffPreviews,
	});
}
