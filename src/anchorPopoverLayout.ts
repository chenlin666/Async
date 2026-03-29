/** 视口边缘留白 */
export const POPOVER_VIEW_MARGIN = 10;
/** 与锚点间距 */
export const POPOVER_GAP = 8;
/**
 * 菜单在视口内希望保持的参考最小高度（实际 minHeight 不超过 maxHeight，避免超出视口）
 */
export const POPOVER_MENU_MIN_HEIGHT = 200;
/** 相对视口高度的硬上限比例 */
export const POPOVER_MAX_VIEWPORT_RATIO = 0.88;

export type PopoverPlacement = 'below' | 'above';

export type ClampedPopoverLayout = {
	placement: PopoverPlacement;
	left: number;
	width: number;
	top?: number;
	bottom?: number;
	maxHeightPx: number;
	minHeightPx: number;
};

export type ClampPopoverOptions = {
	viewportWidth: number;
	viewportHeight: number;
	menuWidth: number;
	/** 内容自然高度：测量 scrollHeight 或合理估算 */
	contentHeight: number;
};

/**
 * 优先在锚点下方展开；若下方空间不足且上方更宽裕则向上展开。
 * 最终 maxHeight 不超过可用空间，超出部分由 overflow:auto 滚动。
 */
export function computeClampedPopoverLayout(
	anchorRect: DOMRectReadOnly | DOMRect,
	opts: ClampPopoverOptions
): ClampedPopoverLayout {
	const { viewportWidth: vw, viewportHeight: vh, menuWidth, contentHeight } = opts;
	const r = anchorRect;
	const M = POPOVER_VIEW_MARGIN;
	const G = POPOVER_GAP;

	let left = r.left;
	if (left + menuWidth > vw - M) {
		left = Math.max(M, vw - menuWidth - M);
	}

	const availBelow = Math.max(0, vh - r.bottom - G - M);
	const availAbove = Math.max(0, r.top - G - M);
	const hardCap = Math.max(120, Math.floor(vh * POPOVER_MAX_VIEWPORT_RATIO));
	const desired = Math.min(Math.max(contentHeight, 1), hardCap);

	const needMoreThanBelow = desired > availBelow;
	const aboveIsRoomier = availAbove > availBelow;
	const useAbove = needMoreThanBelow && aboveIsRoomier;

	let maxH: number;
	if (useAbove) {
		maxH = Math.max(64, Math.min(desired, availAbove, hardCap));
	} else {
		maxH = Math.max(64, Math.min(desired, availBelow, hardCap));
	}

	const minH = Math.min(POPOVER_MENU_MIN_HEIGHT, maxH);

	if (useAbove) {
		return {
			placement: 'above',
			left,
			width: menuWidth,
			bottom: vh - r.top + G,
			maxHeightPx: maxH,
			minHeightPx: minH,
		};
	}

	return {
		placement: 'below',
		left,
		width: menuWidth,
		top: r.bottom + G,
		maxHeightPx: maxH,
		minHeightPx: minH,
	};
}

/**
 * 将矩形垂直位置限制在视口内（用于小浮层、tooltip）
 */
export function clampVerticalInViewport(
	top: number,
	floatingHeight: number,
	viewportHeight: number,
	margin = POPOVER_VIEW_MARGIN
): number {
	const maxTop = Math.max(margin, viewportHeight - margin - floatingHeight);
	return Math.min(Math.max(margin, top), maxTop);
}
