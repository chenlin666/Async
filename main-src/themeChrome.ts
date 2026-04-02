import { BrowserWindow } from 'electron';

/** Keep native window chrome aligned with renderer theme tokens. */
export const THEME_CHROME = {
	light: {
		backgroundColor: '#edf2f8',
		titleBarOverlay: {
			color: '#eef3f8',
			symbolColor: '#1e2936',
			height: 44,
		},
	},
	dark: {
		backgroundColor: '#10161b',
		titleBarOverlay: {
			color: '#141b22',
			symbolColor: '#d1dde1',
			height: 44,
		},
	},
} as const;

export type ThemeChromeScheme = keyof typeof THEME_CHROME;

export function applyThemeChromeToAllWindows(scheme: ThemeChromeScheme): void {
	const c = THEME_CHROME[scheme];
	for (const win of BrowserWindow.getAllWindows()) {
		if (win.isDestroyed()) {
			continue;
		}
		win.setBackgroundColor(c.backgroundColor);
		if (process.platform === 'win32') {
			try {
				win.setTitleBarOverlay({ ...c.titleBarOverlay });
			} catch {
				/* ignore */
			}
		}
	}
}
