import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from './i18n';
import {
	clampVerticalInViewport,
	computeClampedPopoverLayout,
	type ClampedPopoverLayout,
} from './anchorPopoverLayout';
import type { SpeedTag } from './modelCatalog';

export type ModelPickerItem = {
	id: string;
	label: string;
	description: string;
	speedTag: SpeedTag;
	subtitle?: string;
};

function IconGlobe({ className }: { className?: string }) {
	return (
		<svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	);
}

function IconCheck({ className }: { className?: string }) {
	return (
		<svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
			<path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

type Props = {
	open: boolean;
	onClose: () => void;
	anchorRef: React.RefObject<HTMLElement | null>;
	items: ModelPickerItem[];
	selectedId: string;
	/** 点击某一模型行时切换当前对话模型 */
	onSelectModel: (id: string) => void;
	/** Edit 按钮进入设置页 */
	onNavigateToSettings: () => void;
	onAddModels: () => void;
};

type MenuLayout = ClampedPopoverLayout & { minWidth: number };

export function ModelPickerDropdown({
	open,
	onClose,
	anchorRef,
	items,
	selectedId,
	onSelectModel,
	onNavigateToSettings,
	onAddModels,
}: Props) {
	const { t } = useI18n();
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuLayout, setMenuLayout] = useState<MenuLayout>({
		placement: 'below',
		left: 0,
		width: 300,
		minWidth: 300,
		top: 100,
		maxHeightPx: 400,
		minHeightPx: 160,
	});
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
	const rowRefs = useRef<Map<string, HTMLElement | null>>(new Map());

	const computeLayout = useCallback(() => {
		const el = anchorRef.current;
		if (!el) {
			return;
		}
		const menu = menuRef.current;
		const r = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const minW = Math.max(300, r.width);
		const estimate = Math.min(420, Math.max(160, items.length * 52 + 140));
		const natural =
			menu && menu.scrollHeight > 48 ? Math.max(menu.scrollHeight, estimate) : estimate;
		const L = computeClampedPopoverLayout(r, {
			viewportWidth: vw,
			viewportHeight: vh,
			menuWidth: minW,
			contentHeight: natural,
		});
		setMenuLayout({ ...L, minWidth: minW });
	}, [anchorRef, items.length]);

	useLayoutEffect(() => {
		if (!open) {
			return;
		}
		computeLayout();
		const id0 = requestAnimationFrame(() => {
			computeLayout();
			requestAnimationFrame(() => computeLayout());
		});
		const menu = menuRef.current;
		const ro =
			menu && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => computeLayout())
				: null;
		if (menu && ro) {
			ro.observe(menu);
		}
		const onWin = () => computeLayout();
		window.addEventListener('resize', onWin);
		window.addEventListener('scroll', onWin, true);
		return () => {
			cancelAnimationFrame(id0);
			ro?.disconnect();
			window.removeEventListener('resize', onWin);
			window.removeEventListener('scroll', onWin, true);
		};
	}, [open, computeLayout]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node;
			if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) {
				return;
			}
			onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, onClose, anchorRef]);

	useLayoutEffect(() => {
		if (!open || !hoveredId) {
			setPopoverPos(null);
			return;
		}
		const row = rowRefs.current.get(hoveredId);
		if (!row) {
			setPopoverPos(null);
			return;
		}
		const rr = row.getBoundingClientRect();
		const pw = 260;
		let left = rr.right + 8;
		const vh = window.innerHeight;
		if (left + pw > window.innerWidth - 12) {
			left = Math.max(12, rr.left - pw - 8);
		}
		const top = clampVerticalInViewport(rr.top, 120, vh);
		setPopoverPos({ top, left });
	}, [open, hoveredId]);

	if (!open) {
		return null;
	}

	const hovered = hoveredId ? items.find((i) => i.id === hoveredId) : undefined;

	const node = (
		<>
			<div
				ref={menuRef}
				className={`ref-model-dd ${menuLayout.placement === 'above' ? 'ref-model-dd--above' : ''}`}
				style={{
					left: menuLayout.left,
					minWidth: menuLayout.minWidth,
					top: menuLayout.placement === 'below' ? menuLayout.top : 'auto',
					bottom: menuLayout.placement === 'above' ? menuLayout.bottom : 'auto',
					maxHeight: menuLayout.maxHeightPx,
					minHeight: menuLayout.minHeightPx,
					overflowY: 'auto',
				}}
				role="listbox"
				aria-label={t('modelPicker.selectAria')}
				onMouseLeave={() => setHoveredId(null)}
			>
				<div className="ref-model-dd-inner">
					{items.map((m) => {
						const isSel = selectedId === m.id;
						return (
							<div
								key={m.id}
								ref={(el) => {
									if (el) {
										rowRefs.current.set(m.id, el);
									} else {
										rowRefs.current.delete(m.id);
									}
								}}
								role="option"
								aria-selected={isSel}
								tabIndex={0}
								className={`ref-model-dd-row ${isSel ? 'is-selected' : ''}`}
								onMouseEnter={() => setHoveredId(m.id)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										void onSelectModel(m.id);
										onClose();
									}
								}}
								onClick={() => {
									void onSelectModel(m.id);
									onClose();
								}}
							>
								<span className="ref-model-dd-globe" aria-hidden>
									<IconGlobe />
								</span>
								<span className="ref-model-dd-main">
									<span className="ref-model-dd-label">{m.label}</span>
									{m.subtitle ? <span className="ref-model-dd-sub">{m.subtitle}</span> : null}
								</span>
								<span className={`ref-model-dd-tag ref-model-dd-tag--${m.speedTag.toLowerCase()}`}>
									{t(`modelPicker.speed.${m.speedTag.toLowerCase()}`)}
								</span>
								{isSel ? (
									<span className="ref-model-dd-check" aria-hidden>
										<IconCheck />
									</span>
								) : (
									<span className="ref-model-dd-check-placeholder" aria-hidden />
								)}
								<button
									type="button"
									className="ref-model-dd-edit"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onNavigateToSettings();
										onClose();
									}}
								>
									{t('modelPicker.edit')}
								</button>
							</div>
						);
					})}
				</div>
				<div className="ref-model-dd-sep" role="separator" />
				<button type="button" className="ref-model-dd-add" onClick={() => { onAddModels(); onClose(); }}>
					{t('modelPicker.addModels')}
				</button>
			</div>
			{hovered && popoverPos ? (
				<div
					className="ref-model-dd-popover"
					style={{ top: popoverPos.top, left: popoverPos.left }}
					role="tooltip"
				>
					<p className="ref-model-dd-popover-text">{hovered.description}</p>
				</div>
			) : null}
		</>
	);

	return createPortal(node, document.body);
}
