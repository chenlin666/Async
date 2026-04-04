import type { ReactNode } from 'react';
import type { AppColorMode, ThemeTransitionOrigin } from './colorMode';
import {
	APPLE_UI_FONT_STACK,
	INTER_UI_FONT_STACK,
	SEGOE_UI_FONT_STACK,
	type AppAppearanceSettings,
	type UiFontPresetId,
} from './appearanceSettings';
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
	appearance: AppAppearanceSettings;
	onChangeAppearance: (next: AppAppearanceSettings) => void | Promise<void>;
};

export function SettingsAppearancePanel({ value, onChange, appearance, onChangeAppearance }: Props) {
	const { t } = useI18n();
	const modes: { id: AppColorMode; label: string; icon: ReactNode; previewClass: string }[] = [
		{ id: 'light', label: t('settings.appearance.light'), icon: <IconSun className="ref-appearance-seg-ico" />, previewClass: 'is-light' },
		{ id: 'dark', label: t('settings.appearance.dark'), icon: <IconMoon className="ref-appearance-seg-ico" />, previewClass: 'is-dark' },
		{ id: 'system', label: t('settings.appearance.system'), icon: <IconMonitor className="ref-appearance-seg-ico" />, previewClass: 'is-system' },
	];
	const fontPresets: { id: UiFontPresetId; label: string; desc: string; stack: string; badge?: string }[] = [
		{
			id: 'apple',
			label: t('settings.appearance.font.apple'),
			desc: t('settings.appearance.font.appleDesc'),
			stack: APPLE_UI_FONT_STACK,
			badge: t('settings.appearance.defaultBadge'),
		},
		{
			id: 'inter',
			label: t('settings.appearance.font.inter'),
			desc: t('settings.appearance.font.interDesc'),
			stack: INTER_UI_FONT_STACK,
		},
		{
			id: 'segoe',
			label: t('settings.appearance.font.segoe'),
			desc: t('settings.appearance.font.segoeDesc'),
			stack: SEGOE_UI_FONT_STACK,
		},
	];
	const activeFont = fontPresets.find((item) => item.id === appearance.uiFontPreset) ?? fontPresets[0];

	return (
		<div className="ref-settings-panel ref-settings-panel--appearance">
			<p className="ref-appearance-lead">{t('settings.appearance.lead')}</p>

			<section className="ref-settings-agent-section" aria-labelledby="appearance-theme-heading">
				<h2 id="appearance-theme-heading" className="ref-settings-agent-section-title">
					{t('settings.appearance.themeTitle')}
				</h2>
				<p className="ref-settings-agent-section-desc">{t('settings.appearance.themeDesc')}</p>
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
				<div className="ref-appearance-theme-grid">
					{modes.map((m) => (
						<button
							key={m.id}
							type="button"
							className={`ref-appearance-theme-card ${m.previewClass}${value === m.id ? ' is-active' : ''}`}
							onClick={(event) => void onChange(m.id, { x: event.clientX, y: event.clientY })}
							aria-pressed={value === m.id}
						>
							<span className="ref-appearance-theme-preview" aria-hidden>
								<span className="ref-appearance-theme-topbar" />
								<span className="ref-appearance-theme-column">
									<span className="ref-appearance-theme-pill" />
									<span className="ref-appearance-theme-pill ref-appearance-theme-pill--short" />
								</span>
								<span className="ref-appearance-theme-pane">
									<span className="ref-appearance-theme-line" />
									<span className="ref-appearance-theme-line ref-appearance-theme-line--short" />
									<span className="ref-appearance-theme-line ref-appearance-theme-line--tiny" />
								</span>
							</span>
							<span className="ref-appearance-theme-copy">
								<span className="ref-appearance-theme-name">{m.label}</span>
								<span className="ref-appearance-theme-note">{t(`settings.appearance.modeNote.${m.id}`)}</span>
							</span>
						</button>
					))}
				</div>
			</section>

			<section className="ref-settings-agent-section" aria-labelledby="appearance-font-heading">
				<div className="ref-settings-agent-section-head ref-settings-agent-section-head--wrap">
					<h2 id="appearance-font-heading" className="ref-settings-agent-section-title">
						{t('settings.appearance.fontTitle')}
					</h2>
					<span className="ref-appearance-section-chip">{t('settings.appearance.defaultApple')}</span>
				</div>
				<p className="ref-settings-agent-section-desc">{t('settings.appearance.fontDesc')}</p>
				<div className="ref-appearance-font-grid" role="list" aria-label={t('settings.appearance.fontTitle')}>
					{fontPresets.map((font) => (
						<button
							key={font.id}
							type="button"
							role="listitem"
							className={`ref-appearance-font-card${appearance.uiFontPreset === font.id ? ' is-active' : ''}`}
							onClick={() => void onChangeAppearance({ ...appearance, uiFontPreset: font.id })}
						>
							<div className="ref-appearance-font-card-head">
								<div>
									<div className="ref-appearance-font-card-title">{font.label}</div>
									<p className="ref-appearance-font-card-desc">{font.desc}</p>
								</div>
								{font.badge ? <span className="ref-appearance-font-card-badge">{font.badge}</span> : null}
							</div>
							<div className="ref-appearance-font-sample" style={{ fontFamily: font.stack }}>
								<span className="ref-appearance-font-sample-title">{t('settings.appearance.previewTitle')}</span>
								<span className="ref-appearance-font-sample-body">{t('settings.appearance.previewBody')}</span>
							</div>
						</button>
					))}
				</div>
			</section>

			<section className="ref-settings-agent-section" aria-labelledby="appearance-preview-heading">
				<h2 id="appearance-preview-heading" className="ref-settings-agent-section-title">
					{t('settings.appearance.previewSection')}
				</h2>
				<p className="ref-settings-agent-section-desc">{t('settings.appearance.previewDesc')}</p>
				<div className="ref-appearance-preview-card" style={{ fontFamily: activeFont.stack }}>
					<div className="ref-appearance-preview-toolbar">
						<span className="ref-appearance-preview-dot" />
						<span className="ref-appearance-preview-dot" />
						<span className="ref-appearance-preview-dot" />
						<span className="ref-appearance-preview-toolbar-title">{t('settings.appearance.previewWindow')}</span>
					</div>
					<div className="ref-appearance-preview-body">
						<div className="ref-appearance-preview-sidebar">
							<span className="ref-appearance-preview-nav is-active">{t('settings.nav.appearance')}</span>
							<span className="ref-appearance-preview-nav">{t('settings.nav.editor')}</span>
							<span className="ref-appearance-preview-nav">{t('settings.nav.indexing')}</span>
						</div>
						<div className="ref-appearance-preview-main">
							<strong className="ref-appearance-preview-heading">{t('settings.appearance.previewTitle')}</strong>
							<p className="ref-appearance-preview-copy">{t('settings.appearance.previewBody')}</p>
							<div className="ref-appearance-preview-actions">
								<span className="ref-appearance-preview-button is-primary">{t('common.save')}</span>
								<span className="ref-appearance-preview-button">{t('common.cancel')}</span>
							</div>
						</div>
					</div>
				</div>
				<p className="ref-appearance-footnote">{t('settings.appearance.editorNote')}</p>
			</section>
		</div>
	);
}
