export type UiFontPresetId = 'apple' | 'inter' | 'segoe';

export type AppAppearanceSettings = {
	uiFontPreset: UiFontPresetId;
};

export const APPLE_UI_FONT_STACK =
	'-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif';
export const INTER_UI_FONT_STACK =
	'"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const SEGOE_UI_FONT_STACK =
	'"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

export function defaultAppearanceSettings(): AppAppearanceSettings {
	return {
		uiFontPreset: 'apple',
	};
}

export function normalizeUiFontPreset(raw: unknown): UiFontPresetId {
	if (raw === 'apple' || raw === 'inter' || raw === 'segoe') {
		return raw;
	}
	return 'apple';
}

export function normalizeAppearanceSettings(
	raw?: Partial<{ uiFontPreset?: unknown }> | null
): AppAppearanceSettings {
	return {
		uiFontPreset: normalizeUiFontPreset(raw?.uiFontPreset),
	};
}

export function resolveUiFontFamily(preset: UiFontPresetId): string {
	switch (preset) {
		case 'inter':
			return INTER_UI_FONT_STACK;
		case 'segoe':
			return SEGOE_UI_FONT_STACK;
		case 'apple':
		default:
			return APPLE_UI_FONT_STACK;
	}
}

export function applyAppearanceSettingsToDom(settings: AppAppearanceSettings): void {
	if (typeof document === 'undefined') {
		return;
	}
	document.documentElement.style.setProperty('--void-ui-font-family', resolveUiFontFamily(settings.uiFontPreset));
	document.documentElement.setAttribute('data-ui-font', settings.uiFontPreset);
}
