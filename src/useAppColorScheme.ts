import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppColorMode, ThemeTransitionOrigin } from './colorMode';
import { APP_UI_STYLE, readPrefersDark, resolveEffectiveScheme } from './colorMode';

function applyDomColorScheme(effective: 'light' | 'dark'): void {
	document.documentElement.setAttribute('data-ui-style', APP_UI_STYLE);
	document.documentElement.setAttribute('data-color-scheme', effective);
}

function applyThemeTransitionOrigin(origin?: ThemeTransitionOrigin | null): void {
	const fallbackX = typeof window !== 'undefined' ? window.innerWidth - 88 : 1200;
	const fallbackY = 60;
	const x = Math.round(origin?.x ?? fallbackX);
	const y = Math.round(origin?.y ?? fallbackY);
	document.documentElement.style.setProperty('--theme-switch-x', `${x}px`);
	document.documentElement.style.setProperty('--theme-switch-y', `${y}px`);
}

/**
 * ?? View Transitions ???????????????
 * Monaco ??? `theme` prop ???????? effectiveScheme ????????
 */
function applyColorSchemeWithTransition(effective: 'light' | 'dark'): void {
	const go = () => {
		applyDomColorScheme(effective);
	};
	const doc = document as Document & {
		startViewTransition?: (cb: () => void) => { finished: Promise<void> };
	};
	if (typeof doc.startViewTransition === 'function') {
		const vt = doc.startViewTransition(go);
		void vt.finished.catch(() => {});
	} else {
		go();
	}
}

type Shell = NonNullable<Window['asyncShell']>;

type Options = {
	colorMode: AppColorMode;
	shell: Shell | undefined;
};

export function useAppColorScheme({
	colorMode,
	shell,
}: Options): {
	effectiveScheme: 'light' | 'dark';
	setTransitionOrigin: (origin?: ThemeTransitionOrigin) => void;
} {
	const [prefersDark, setPrefersDark] = useState(readPrefersDark);
	const firstDomApplyRef = useRef(true);
	const pendingTransitionOriginRef = useRef<ThemeTransitionOrigin | null>(null);

	useEffect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => setPrefersDark(mq.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	const effectiveScheme = useMemo(
		() => resolveEffectiveScheme(colorMode, prefersDark),
		[colorMode, prefersDark]
	);

	useEffect(() => {
		if (firstDomApplyRef.current) {
			firstDomApplyRef.current = false;
			applyThemeTransitionOrigin(pendingTransitionOriginRef.current);
			applyDomColorScheme(effectiveScheme);
			return;
		}
		applyThemeTransitionOrigin(pendingTransitionOriginRef.current);
		pendingTransitionOriginRef.current = null;
		applyColorSchemeWithTransition(effectiveScheme);
	}, [effectiveScheme]);

	useEffect(() => {
		if (!shell) {
			return;
		}
		void shell.invoke('theme:applyChrome', { scheme: effectiveScheme });
	}, [shell, effectiveScheme]);

	return {
		effectiveScheme,
		setTransitionOrigin(origin?: ThemeTransitionOrigin) {
			pendingTransitionOriginRef.current = origin ?? null;
		},
	};
}
