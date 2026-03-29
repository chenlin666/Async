import { useMemo, useState } from 'react';
import {
	countDiffAddDel,
	diffPathToWorkspaceRel,
	extractDiffDisplayPath,
	firstHunkNewStartLine,
} from './agentChatSegments';
import { FileTypeIcon } from './fileTypeIcons';

function IconChevronDiff({ expanded, className }: { expanded: boolean; className?: string }) {
	return (
		<svg
			className={className}
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			{expanded ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
		</svg>
	);
}

function lineClassName(line: string): string {
	let mod = 'ref-agent-diff-line';
	if (line.startsWith('+') && !line.startsWith('+++')) {
		mod += ' is-add';
	} else if (line.startsWith('-') && !line.startsWith('---')) {
		mod += ' is-del';
	} else if (line.startsWith('@@')) {
		mod += ' is-hunk';
	} else if (
		line.startsWith('diff ') ||
		line.startsWith('index ') ||
		line.startsWith('--- ') ||
		line.startsWith('+++ ')
	) {
		mod += ' is-meta';
	}
	return mod;
}

/** 折叠时最多展示的行数（Cursor 式预览，非全文） */
const DIFF_PREVIEW_MAX_LINES = 10;

type Props = {
	diff: string;
	/** 当前工作区根路径，用于把 diff 里的绝对路径转成相对路径 */
	workspaceRoot?: string | null;
	/** 点击标题区：右侧打开文件并滚动到首个 hunk 对应行 */
	onOpenFile?: (relPath: string, revealLine?: number) => void;
};

export function AgentDiffCard({ diff, workspaceRoot, onOpenFile }: Props) {
	const rawPath = extractDiffDisplayPath(diff);
	const rel = diffPathToWorkspaceRel(rawPath, workspaceRoot);
	const openTarget = (rel || rawPath.replace(/\\/g, '/')).trim();
	const base = openTarget.split('/').pop() || rawPath.replace(/\\/g, '/').split('/').pop() || rawPath;
	const { additions, deletions } = countDiffAddDel(diff);
	const lines = useMemo(() => diff.split('\n'), [diff]);
	const [expanded, setExpanded] = useState(false);
	const revealLine = firstHunkNewStartLine(diff);

	const needsCollapse = lines.length > DIFF_PREVIEW_MAX_LINES;
	const visibleLines = needsCollapse && !expanded ? lines.slice(0, DIFF_PREVIEW_MAX_LINES) : lines;
	const hiddenCount = needsCollapse ? lines.length - DIFF_PREVIEW_MAX_LINES : 0;

	const canOpen = Boolean(onOpenFile && openTarget);

	const handleOpen = () => {
		if (!onOpenFile || !openTarget) {
			return;
		}
		onOpenFile(openTarget, revealLine ?? undefined);
	};

	const headInner = (
		<>
			<span className="ref-agent-diff-card-ico" aria-hidden>
				<FileTypeIcon fileName={base} isDirectory={false} className="ref-agent-diff-card-ico-svg" />
			</span>
			<span className="ref-agent-diff-card-name" title={rawPath}>
				{base}
			</span>
			<span className="ref-agent-diff-card-stats">
				{additions > 0 ? <span className="ref-agent-diff-stat-add">+{additions}</span> : null}
				{deletions > 0 ? <span className="ref-agent-diff-stat-del">−{deletions}</span> : null}
				{additions === 0 && deletions === 0 ? <span className="ref-agent-diff-stat-neutral">0</span> : null}
			</span>
		</>
	);

	const pathLine =
		openTarget !== base ? (
			<div className="ref-agent-diff-card-path" title={openTarget}>
				{openTarget}
			</div>
		) : null;

	return (
		<div className="ref-agent-diff-card" role="article" aria-label={`改动：${base}`}>
			{canOpen ? (
				<button
					type="button"
					className="ref-agent-diff-card-open"
					aria-label={`在右侧打开 ${openTarget}${revealLine ? `，定位约第 ${revealLine} 行` : ''}`}
					onClick={handleOpen}
				>
					<div className="ref-agent-diff-card-head">{headInner}</div>
					{pathLine}
				</button>
			) : (
				<div className="ref-agent-diff-card-head">{headInner}</div>
			)}
			<div
				className={[
					'ref-agent-diff-card-body',
					needsCollapse && !expanded ? 'ref-agent-diff-card-body--preview' : 'ref-agent-diff-card-body--expanded',
				].join(' ')}
			>
				<div className="ref-agent-diff-lines" role="region" aria-label="Unified diff">
					{visibleLines.map((line, i) => (
						<div key={i} className={lineClassName(line)}>
							{line || '\u00a0'}
						</div>
					))}
				</div>
				{needsCollapse ? (
					<div className={['ref-agent-diff-preview-chrome', expanded ? 'is-expanded' : ''].filter(Boolean).join(' ')}>
						{!expanded ? <div className="ref-agent-diff-preview-fade" aria-hidden /> : null}
						<button
							type="button"
							className="ref-agent-diff-toggle"
							aria-expanded={expanded}
							aria-label={
								expanded ? '收起 diff，仅显示预览' : `展开全部 diff（还有 ${hiddenCount} 行）`
							}
							onClick={(e) => {
								e.stopPropagation();
								setExpanded((ex) => !ex);
							}}
						>
							<IconChevronDiff expanded={expanded} className="ref-agent-diff-toggle-ico" />
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
