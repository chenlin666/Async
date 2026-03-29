import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FileTypeIcon } from './fileTypeIcons';

export type GitPathStatusMap = Record<string, { xy: string; label: string }>;

type DirEntry = { name: string; isDirectory: boolean; rel: string };

type AsyncShell = NonNullable<Window['asyncShell']>;

function IconChevronTree({ open }: { open: boolean }) {
	return (
		<svg
			className={`ref-explorer-chevron-svg ${open ? 'is-open' : ''}`}
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden
		>
			<path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function dirContainsStatus(dirRel: string, statusPaths: string[]): boolean {
	if (!statusPaths.length) {
		return false;
	}
	if (!dirRel) {
		return statusPaths.length > 0;
	}
	const prefix = `${dirRel}/`;
	return statusPaths.some((p) => p === dirRel || p.startsWith(prefix));
}

function fileStatusClass(label: string): string {
	const k = label.toLowerCase();
	if (k === 'u') {
		return 'ref-explorer-name--git-u';
	}
	if (k === 'm') {
		return 'ref-explorer-name--git-m';
	}
	if (k === 'a') {
		return 'ref-explorer-name--git-a';
	}
	if (k === 'd') {
		return 'ref-explorer-name--git-d';
	}
	if (k === 'i') {
		return 'ref-explorer-name--git-i';
	}
	return 'ref-explorer-name--git-other';
}

function badgeVariant(label: string): string {
	const k = label.toLowerCase();
	if (k === 'u' || k === 'm' || k === 'a' || k === 'd' || k === 'i' || k === 'r' || k === 'c' || k === 't') {
		return k;
	}
	return 'misc';
}

function badgeClass(label: string): string {
	return `ref-explorer-badge ref-explorer-badge--${badgeVariant(label)}`;
}

type Props = {
	shell: AsyncShell;
	pathStatus: GitPathStatusMap;
	selectedRel: string;
	treeEpoch: number;
	onOpenFile: (relPath: string) => void;
};

export function WorkspaceExplorer({ shell, pathStatus, selectedRel, treeEpoch, onOpenFile }: Props) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['']));
	const [cache, setCache] = useState<Record<string, DirEntry[]>>({});
	const [loading, setLoading] = useState<Set<string>>(() => new Set());
	const expandedRef = useRef(expanded);
	expandedRef.current = expanded;

	const statusPaths = useMemo(() => Object.keys(pathStatus), [pathStatus]);

	const loadDir = useCallback(
		async (rel: string) => {
			setLoading((s) => new Set(s).add(rel));
			try {
				const r = (await shell.invoke('fs:listDir', rel)) as
					| { ok: true; entries: DirEntry[] }
					| { ok: false; error?: string };
				if (r.ok) {
					setCache((c) => ({ ...c, [rel]: r.entries }));
				} else {
					setCache((c) => ({ ...c, [rel]: [] }));
				}
			} finally {
				setLoading((s) => {
					const n = new Set(s);
					n.delete(rel);
					return n;
				});
			}
		},
		[shell]
	);

	useEffect(() => {
		setCache({});
		setExpanded(new Set(['']));
		void loadDir('');
	}, [shell, loadDir]);

	useEffect(() => {
		const dirs = [...new Set(['', ...Array.from(expandedRef.current)])];
		void Promise.all(dirs.map((d) => loadDir(d)));
	}, [treeEpoch, loadDir]);

	const toggleDir = (rel: string) => {
		setExpanded((prev) => {
			const n = new Set(prev);
			if (n.has(rel)) {
				n.delete(rel);
			} else {
				n.add(rel);
				if (!cache[rel]) {
					void loadDir(rel);
				}
			}
			return n;
		});
	};

	const renderDir = (parentRel: string, depth: number): ReactNode => {
		const entries = cache[parentRel];
		if (entries === undefined) {
			return loading.has(parentRel) ? (
				<div className="ref-explorer-loading" style={{ paddingLeft: 12 + depth * 14 }}>
					加载中…
				</div>
			) : null;
		}
		if (entries.length === 0 && parentRel === '' && !loading.has('')) {
			return <div className="ref-explorer-empty">空目录</div>;
		}
		return entries.map((ent) => {
			const st = pathStatus[ent.rel];
			const label = st?.label;
			const isOpen = expanded.has(ent.rel);
			const nestedDirty = ent.isDirectory && dirContainsStatus(ent.rel, statusPaths);
			const rowClass = [
				'ref-explorer-row',
				ent.isDirectory ? 'ref-explorer-row--dir' : 'ref-explorer-row--file',
				selectedRel === ent.rel ? 'is-selected' : '',
				ent.isDirectory && nestedDirty ? 'ref-explorer-row--nested-dirty' : '',
			]
				.filter(Boolean)
				.join(' ');

			return (
				<Fragment key={ent.rel}>
					<div
						className={rowClass}
						style={{ paddingLeft: 10 + depth * 14 }}
						role="treeitem"
						aria-expanded={ent.isDirectory ? isOpen : undefined}
					>
						<span className="ref-explorer-chevron-cell">
							{ent.isDirectory ? (
								<button
									type="button"
									className="ref-explorer-chevron-btn"
									aria-label={isOpen ? '折叠' : '展开'}
									onClick={(e) => {
										e.stopPropagation();
										toggleDir(ent.rel);
									}}
								>
									<IconChevronTree open={isOpen} />
								</button>
							) : null}
						</span>
						<span className="ref-explorer-icon-cell" aria-hidden>
							<FileTypeIcon fileName={ent.name} isDirectory={ent.isDirectory} />
						</span>
						<button
							type="button"
							className={`ref-explorer-label ${!ent.isDirectory && label ? fileStatusClass(label) : ''} ${ent.isDirectory && !label && nestedDirty ? 'ref-explorer-name--dim-dirty' : ''}`}
							onClick={() => {
								if (ent.isDirectory) {
									toggleDir(ent.rel);
								} else {
									onOpenFile(ent.rel);
								}
							}}
						>
							{ent.name}
						</button>
						{label && !ent.isDirectory ? <span className={badgeClass(label)}>{label}</span> : null}
					</div>
					{ent.isDirectory && isOpen ? renderDir(ent.rel, depth + 1) : null}
				</Fragment>
			);
		});
	};

	return (
		<div className="ref-explorer-tree" role="tree">
			{renderDir('', 0)}
		</div>
	);
}
