import type { ReactNode } from 'react';
import type { AppColorMode, ThemeTransitionOrigin } from './colorMode';
import { useI18n } from './i18n';

function IconSun({ className }: { className?: string }) {
	return (
		<svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
		</svg>
	);
}

function IconMoon({ className }: { className?: string }) {
	return (
		<svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function IconMonitor({ className }: { className?: string }) {
	return (
		<svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<rect x="2" y="3" width="20" height="14" rx="2" />
			<path d="M8 21h8M12 17v4" strokeLinecap="round" />
		</svg>
	);
}

type Props = {
	value: AppColorMode;
	onChange: (next: AppColorMode, origin?: ThemeTransitionOrigin) => void | Promise<void>;
};

export function SettingsAppearancePanel({ value, onChange }: Props) {
	const { t } = useI18n();
	const modes: { id: AppColorMode; label: string; icon: ReactNode }[] = [
		{ id: 'light', label: t('settings.appearance.light'), icon: <IconSun className="ref-appearance-seg-ico" /> },
		{ id: 'dark', label: t('settings.appearance.dark'), icon: <IconMoon className="ref-appearance-seg-ico" /> },
		{ id: 'system', label: t('settings.appearance.system'), icon: <IconMonitor className="ref-appearance-seg-ico" /> },
	];
	return (
		<div className="ref-settings-panel">
			<p className="ref-appearance-lead">{t('settings.appearance.lead')}</p>
			<div className="ref-appearance-seg" role="group" aria-label={t('settings.appearance.ariaGroup')}>
				{modes.map((m) => (
					<button
						key={m.id}
						type="button"
						className={`ref-appearance-seg-btn${value === m.id ? ' is-active' : ''}`}
						onClick={(event) => void onChange(m.id, { x: event.clientX, y: event.clientY })}
						aria-pressed={value === m.id}
					>
						{m.icon}
						{m.label}
					</button>
				))}
			</div>
		</div>
	);
}
