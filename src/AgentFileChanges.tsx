import { useState } from 'react';
import { FileTypeIcon } from './fileTypeIcons';
import type { FileChangeSummary } from './agentChatSegments';
import { useI18n } from './i18n';

type Props = {
	files: FileChangeSummary[];
	onOpenFile?: (relPath: string, revealLine?: number) => void;
	onKeepAll?: () => void;
	onRevertAll?: () => void;
};

function basename(p: string): string {
	const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
	return i >= 0 ? p.slice(i + 1) : p;
}

export function AgentFileChangesPanel({ files, onOpenFile, onKeepAll, onRevertAll }: Props) {
	const { t } = useI18n();
	const [expanded, setExpanded] = useState(true);

	if (files.length === 0) return null;

	return (
		<div className="ref-fcp">
			<div className="ref-fcp-header">
				<button
					type="button"
					className="ref-fcp-toggle"
					onClick={() => setExpanded((e) => !e)}
					aria-expanded={expanded}
				>
					<svg
						className={`ref-fc-chevron ${expanded ? 'ref-fc-chevron--open' : ''}`}
						width="12" height="12" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" strokeWidth="2.5"
						strokeLinecap="round" strokeLinejoin="round"
					>
						<path d="M6 9l6 6 6-6" />
					</svg>
					<span className="ref-fcp-count">{t('agent.files.count', { count: files.length })}</span>
				</button>
				<span className="ref-fcp-actions">
					<button
						type="button"
						className="ref-fcp-btn ref-fcp-btn--keep"
						onClick={onKeepAll}
					>
						{t('agent.keepAll')}
					</button>
					<button
						type="button"
						className="ref-fcp-btn ref-fcp-btn--revert"
						onClick={onRevertAll}
					>
						{t('agent.revertAll')}
					</button>
				</span>
			</div>

			{expanded && (
				<div className="ref-fcp-list">
					{files.map((f) => {
						const name = basename(f.path);
						return (
							<button
								key={f.path}
								type="button"
								className="ref-fc-row"
								title={f.path}
								onClick={() => onOpenFile?.(f.path, f.startLine)}
							>
								<FileTypeIcon
									fileName={name}
									isDirectory={false}
									className="ref-fc-icon"
								/>
								<span className="ref-fc-name">{name}</span>
								<span className="ref-fc-stats">
									{f.additions > 0 && (
										<span className="ref-fc-add">+{f.additions}</span>
									)}
									{f.deletions > 0 && (
										<span className="ref-fc-del">-{f.deletions}</span>
									)}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
