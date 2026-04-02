/** ???? `ShellColorMode` ??????????? main-src ??? */
export type AppColorMode = 'light' | 'dark' | 'system';
export type ThemeTransitionOrigin = { x: number; y: number };

export const APP_UI_STYLE = 'mac-codex';
export const COLOR_MODE_STORAGE_KEY = 'async:color-mode-v1';

export function normalizeColorMode(raw: unknown): AppColorMode {
	if (raw === 'light' || raw === 'dark' || raw === 'system') {
		return raw;
	}
	return 'dark';
}

export function readStoredColorMode(): AppColorMode {
	try {
		if (typeof window === 'undefined') {
			return 'dark';
		}
		return normalizeColorMode(localStorage.getItem(COLOR_MODE_STORAGE_KEY));
	} catch {
		return 'dark';
	}
}

export function writeStoredColorMode(mode: AppColorMode): void {
	try {
		localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
	} catch {
		/* ignore */
	}
}

export function readPrefersDark(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveEffectiveScheme(mode: AppColorMode, prefersDark: boolean): 'light' | 'dark' {
	if (mode === 'system') {
		return prefersDark ? 'dark' : 'light';
	}
	return mode;
}

export function getVoidMonacoTheme(effective: 'light' | 'dark'): 'void-light' | 'void-dark' {
	return effective === 'light' ? 'void-light' : 'void-dark';
}

/** Agent ????????????? DOM */
export function getVoidMonacoThemeFromDom(): 'void-light' | 'void-dark' {
	if (typeof document === 'undefined') {
		return 'void-dark';
	}
	return document.documentElement.getAttribute('data-color-scheme') === 'light' ? 'void-light' : 'void-dark';
}
