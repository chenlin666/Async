import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
	createEmptyBotIntegration,
	type BotComposerMode,
	type BotIntegrationConfig,
	type BotPlatform,
} from './botSettingsTypes';
import type { UserModelEntry } from './modelCatalog';
import { useI18n } from './i18n';
import { VoidSelect } from './VoidSelect';

type Props = {
	value: BotIntegrationConfig[];
	onChange: (next: BotIntegrationConfig[]) => void;
	modelEntries: UserModelEntry[];
};

type PlatformMeta = {
	labelZh: string;
	labelEn: string;
	accent: string;
	descriptionZh: string;
	descriptionEn: string;
	tipZh: string;
	tipEn: string;
	addHintZh: string;
	addHintEn: string;
};

const PLATFORM_META: Record<BotPlatform, PlatformMeta> = {
	telegram: {
		labelZh: 'Telegram',
		labelEn: 'Telegram',
		accent: '#2aabee',
		descriptionZh: '适合私聊、话题群和轻量自动化入口。',
		descriptionEn: 'A clean fit for direct chats, topic groups, and lightweight automation.',
		tipZh: '推荐在群聊中要求显式 @ 机器人，避免误触发。',
		tipEn: 'Requiring @mentions in groups helps avoid accidental triggers.',
		addHintZh: '适合开发群、个人助手和话题讨论。',
		addHintEn: 'Great for dev groups, personal assistants, and topic threads.',
	},
	slack: {
		labelZh: 'Slack',
		labelEn: 'Slack',
		accent: '#e01e5a',
		descriptionZh: '适合团队频道、线程回复和 Socket Mode 常驻 bot。',
		descriptionEn: 'Best for team channels, threaded replies, and Socket Mode bots.',
		tipZh: '需要同时配置 Bot Token 和 App Token 才能建立 Socket Mode 连接。',
		tipEn: 'Both a Bot Token and an App Token are required for Socket Mode.',
		addHintZh: '适合团队协作和工作流落地。',
		addHintEn: 'Ideal for team collaboration and workflow-heavy usage.',
	},
	discord: {
		labelZh: 'Discord',
		labelEn: 'Discord',
		accent: '#5865f2',
		descriptionZh: '适合频道式社区、讨论串和多人协作场景。',
		descriptionEn: 'A strong fit for channel-based communities and collaborative servers.',
		tipZh: '建议开启“频道中必须提及机器人”，并在开发者后台打开消息相关 intents。',
		tipEn: 'Prefer requiring mentions in guilds, and enable message-related intents in the developer portal.',
		addHintZh: '适合社群、开源项目和多人频道。',
		addHintEn: 'Works well for communities, OSS projects, and shared channels.',
	},
	feishu: {
		labelZh: '飞书',
		labelEn: 'Feishu',
		accent: '#00c2b8',
		descriptionZh: '适合企业内部协作、群聊问答和工作流辅助。',
		descriptionEn: 'Built for internal collaboration, group Q&A, and workflow assistance.',
		tipZh: '当前实现走长连接事件订阅，自建应用需要正确配置 App ID / Secret。',
		tipEn: 'This implementation uses websocket event delivery, so your self-built app needs a valid App ID / Secret.',
		addHintZh: '适合公司内网、项目群和流程助手。',
		addHintEn: 'Great for internal teams, project groups, and process assistants.',
	},
};

const MODE_OPTIONS: Array<{ value: BotComposerMode; label: string }> = [
	{ value: 'agent', label: 'Agent' },
	{ value: 'ask', label: 'Ask' },
	{ value: 'plan', label: 'Plan' },
	{ value: 'team', label: 'Team' },
];

const platformImageByPlatform: Record<BotPlatform, string> = {
	telegram: new URL('../resources/icons/telegram_icon.png', import.meta.url).href,
	slack: new URL('../resources/icons/slack_icon.png', import.meta.url).href,
	discord: new URL('../resources/icons/discord_icon.png', import.meta.url).href,
	feishu: new URL('../resources/icons/feishu_icon.png', import.meta.url).href,
};

function basenameDisplay(raw: string | null | undefined): string {
	const text = String(raw ?? '').trim();
	if (!text) return '';
	return text.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? text;
}

function linesFromText(raw: string): string[] {
	return raw
		.split(/\r?\n/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function textFromLines(lines: string[] | undefined): string {
	return (lines ?? []).join('\n');
}

function platformLabel(platform: BotPlatform, zh: boolean): string {
	const meta = PLATFORM_META[platform];
	return zh ? meta.labelZh : meta.labelEn;
}

function ensurePlatformShape(item: BotIntegrationConfig, platform: BotPlatform): BotIntegrationConfig {
	const next: BotIntegrationConfig = {
		...item,
		platform,
		telegram: item.telegram ?? { requireMentionInGroups: true, allowedChatIds: [] },
		slack: item.slack ?? { allowedChannelIds: [] },
		discord: item.discord ?? { allowedChannelIds: [], requireMentionInGuilds: true },
		feishu: item.feishu ?? { allowedChatIds: [] },
	};
	if (platform === 'telegram' && next.telegram?.requireMentionInGroups === undefined) {
		next.telegram = { ...(next.telegram ?? {}), requireMentionInGroups: true };
	}
	if (platform === 'discord' && next.discord?.requireMentionInGuilds === undefined) {
		next.discord = { ...(next.discord ?? {}), requireMentionInGuilds: true };
	}
	return next;
}

function createBotForPlatform(platform: BotPlatform, zh: boolean): BotIntegrationConfig {
	return ensurePlatformShape(
		{
			...createEmptyBotIntegration(),
			platform,
			name: zh ? `${platformLabel(platform, true)} 机器人` : `${platformLabel(platform, false)} Bot`,
			defaultMode: 'agent',
			enabled: true,
		},
		platform
	);
}

function countAccessTargets(item: BotIntegrationConfig): number {
	switch (item.platform) {
		case 'telegram':
			return item.telegram?.allowedChatIds?.length ?? 0;
		case 'slack':
			return item.slack?.allowedChannelIds?.length ?? 0;
		case 'discord':
			return item.discord?.allowedChannelIds?.length ?? 0;
		case 'feishu':
			return item.feishu?.allowedChatIds?.length ?? 0;
		default:
			return 0;
	}
}

function modelLabel(modelId: string | undefined, modelEntries: UserModelEntry[], zh: boolean): string {
	if (!modelId) return zh ? '未设置模型' : 'No model';
	const entry = modelEntries.find((item) => item.id === modelId);
	return entry?.displayName.trim() || entry?.requestName || modelId;
}

function botCardSummary(item: BotIntegrationConfig, zh: boolean): { workspace: string; access: string; prompt: string } {
	const extraWorkspaceCount = item.workspaceRoots?.length ?? 0;
	const defaultWorkspace = basenameDisplay(item.defaultWorkspaceRoot);
	const workspace = defaultWorkspace
		? `${defaultWorkspace}${extraWorkspaceCount > 0 ? ` +${extraWorkspaceCount}` : ''}`
		: zh
			? extraWorkspaceCount > 0
				? `${extraWorkspaceCount} 个候选工作区`
				: '自动继承最近工作区'
			: extraWorkspaceCount > 0
				? `${extraWorkspaceCount} workspace candidates`
				: 'Recent workspaces fallback';
	const accessCount = countAccessTargets(item);
	const access = zh
		? accessCount > 0
			? `限制 ${accessCount} 个目标`
			: '未限制目标'
		: accessCount > 0
			? `${accessCount} targets scoped`
			: 'No target filters';
	const prompt = item.systemPrompt?.trim()
		? zh
			? '附加系统提示已配置'
			: 'Extra prompt configured'
		: zh
			? '使用默认桥接提示'
			: 'Using default bridge prompt';
	return { workspace, access, prompt };
}

function platformIcon(platform: BotPlatform): ReactNode {
	return (
		<img
			className="ref-settings-bot-platform-image"
			src={platformImageByPlatform[platform]}
			alt=""
			aria-hidden
			draggable={false}
		/>
	);
}

export function SettingsBotsPanel({ value, onChange, modelEntries }: Props) {
	const { locale } = useI18n();
	const zh = locale !== 'en';
	const modelOptions = useMemo(
		() =>
			[{ value: '', label: zh ? '未设置' : 'Not set' }].concat(
				modelEntries.map((item) => ({
					value: item.id,
					label: item.displayName.trim() || item.requestName || item.id,
				}))
			),
		[modelEntries, zh]
	);
	const [expandedId, setExpandedId] = useState<string | null>(value[0]?.id ?? null);

	useEffect(() => {
		if (expandedId && value.some((item) => item.id === expandedId)) return;
		setExpandedId(value[0]?.id ?? null);
	}, [value, expandedId]);

	const activeCount = value.filter((item) => item.enabled !== false).length;
	const restrictedCount = value.filter((item) => countAccessTargets(item) > 0).length;
	const workspaceCoverage = new Set(
		value.flatMap((item) => [item.defaultWorkspaceRoot ?? '', ...(item.workspaceRoots ?? [])].filter(Boolean))
	).size;

	const updateOne = (id: string, patch: Partial<BotIntegrationConfig>) => {
		onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)));
	};

	const removeOne = (id: string) => {
		onChange(value.filter((item) => item.id !== id));
	};

	const addPlatform = (platform: BotPlatform) => {
		const created = createBotForPlatform(platform, zh);
		onChange([...value, created]);
		setExpandedId(created.id);
	};

	return (
		<div className="ref-settings-panel ref-settings-panel--bots">
			<div className="ref-settings-bots-shell">
				<section className="ref-settings-bots-hero">
					<div>
						<div className="ref-settings-bots-kicker">{zh ? 'Bot Bridge' : 'Bot Bridge'}</div>
						<h3 className="ref-settings-bots-title">
							{zh ? '把 Async 能力接到外部机器人' : 'Bridge Async into external bots'}
						</h3>
						<p className="ref-settings-bots-subtitle">
							{zh
								? '每个机器人都有自己的默认模型、默认模式和工作区访问范围。收到外部消息后，桥接层会先用 tool_call 切换会话状态，再调用 Async 内部执行链路完成任务。'
								: 'Each bot gets its own default model, mode, and workspace scope. Incoming messages first drive session-state tools, then call the internal Async execution flow.'}
						</p>
					</div>
					<div className="ref-settings-bots-stats">
						<div className="ref-settings-bots-stat">
							<span className="ref-settings-bots-stat-label">{zh ? '已配置' : 'Configured'}</span>
							<strong>{value.length}</strong>
						</div>
						<div className="ref-settings-bots-stat">
							<span className="ref-settings-bots-stat-label">{zh ? '已启用' : 'Enabled'}</span>
							<strong>{activeCount}</strong>
						</div>
						<div className="ref-settings-bots-stat">
							<span className="ref-settings-bots-stat-label">{zh ? '目标限制' : 'Scoped Targets'}</span>
							<strong>{restrictedCount}</strong>
						</div>
						<div className="ref-settings-bots-stat">
							<span className="ref-settings-bots-stat-label">{zh ? '工作区覆盖' : 'Workspace Reach'}</span>
							<strong>{workspaceCoverage}</strong>
						</div>
					</div>
				</section>

				<section className="ref-settings-bots-callout">
					<div className="ref-settings-bots-callout-line">
						<strong>{zh ? '能力边界' : 'Execution boundary'}</strong>
						<span>
							{zh
								? '桥接层本身只负责切换会话和调度任务，真正的文件操作、模式切换、工具调用都仍走 Async 现有执行链路。'
								: 'The bridge only coordinates session state and task dispatch. File edits, mode changes, and tool calls still go through Async itself.'}
						</span>
					</div>
					<div className="ref-settings-bots-callout-line">
						<strong>{zh ? '模型要求' : 'Model requirement'}</strong>
						<span>
							{zh
								? '当前建议给机器人选择支持工具调用的 OpenAI 兼容或 Anthropic 模型。'
								: 'For now, choose a tool-capable OpenAI-compatible or Anthropic model for bots.'}
						</span>
					</div>
				</section>

				<section className="ref-settings-bots-add-section">
					<div className="ref-settings-bots-section-head">
						<div>
							<div className="ref-settings-bots-section-kicker">{zh ? 'Quick Start' : 'Quick Start'}</div>
							<h4 className="ref-settings-bots-section-title">{zh ? '按平台快速新建' : 'Create by platform'}</h4>
						</div>
						<p className="ref-settings-bots-section-copy">
							{zh
								? '先选一个平台生成骨架，再补 token、工作区和默认模型。'
								: 'Start from a platform template, then fill in credentials, workspaces, and the default model.'}
						</p>
					</div>
					<div className="ref-settings-bots-platform-grid">
						{(Object.keys(PLATFORM_META) as BotPlatform[]).map((platform) => {
							const meta = PLATFORM_META[platform];
							return (
								<button
									key={platform}
									type="button"
									className="ref-settings-bots-platform-card"
									style={{ '--bot-accent': meta.accent } as CSSProperties}
									onClick={() => addPlatform(platform)}
								>
									<div className="ref-settings-bots-platform-icon">{platformIcon(platform)}</div>
									<div className="ref-settings-bots-platform-head">
										<strong>{platformLabel(platform, zh)}</strong>
										<span>{zh ? meta.addHintZh : meta.addHintEn}</span>
									</div>
								</button>
							);
						})}
					</div>
				</section>

				{value.length === 0 ? (
					<section className="ref-settings-bots-empty">
						<div
							className="ref-settings-bots-empty-ico"
							style={{ '--bot-accent': PLATFORM_META.telegram.accent } as CSSProperties}
						>
							{platformIcon('telegram')}
						</div>
						<div>
							<h4>{zh ? '还没有机器人接入' : 'No bot integrations yet'}</h4>
							<p>
								{zh
									? '从上面的平台卡片开始。你可以给不同团队、不同频道或不同工作区分别配置专属机器人。'
									: 'Start from one of the platform cards above. You can create separate bots for different teams, channels, or workspace scopes.'}
							</p>
						</div>
					</section>
				) : null}

				<div className="ref-settings-bots-list">
					{value.map((item, index) => {
						const current = ensurePlatformShape(item, item.platform);
						const meta = PLATFORM_META[current.platform];
						const expanded = expandedId === current.id;
						const summary = botCardSummary(current, zh);
						const modelText = modelLabel(current.defaultModelId, modelEntries, zh);
						const style = { '--bot-accent': meta.accent } as CSSProperties;
						return (
							<article
								key={current.id}
								className={`ref-settings-bot-card ${current.enabled !== false ? 'is-enabled' : 'is-disabled'} ${expanded ? 'is-expanded' : ''}`}
								style={style}
							>
								<div className="ref-settings-bot-card-head">
									<div className="ref-settings-bot-card-main">
										<div className="ref-settings-bot-card-mark">{platformIcon(current.platform)}</div>
										<div className="ref-settings-bot-card-copy">
											<div className="ref-settings-bot-card-kicker">
												{zh ? `机器人 #${index + 1}` : `Bot #${index + 1}`} · {platformLabel(current.platform, zh)}
											</div>
											<h4 className="ref-settings-bot-card-title">
												{current.name.trim() || (zh ? `${platformLabel(current.platform, true)} 机器人` : `${platformLabel(current.platform, false)} Bot`)}
											</h4>
											<p className="ref-settings-bot-card-subtitle">
												{zh ? meta.descriptionZh : meta.descriptionEn}
											</p>
										</div>
									</div>
									<div className="ref-settings-bot-card-actions">
										<button
											type="button"
											className={`ref-settings-bot-chip-btn ${current.enabled !== false ? 'is-active' : ''}`}
											onClick={() => updateOne(current.id, { enabled: current.enabled === false })}
										>
											{current.enabled !== false ? (zh ? '已启用' : 'Enabled') : zh ? '已暂停' : 'Paused'}
										</button>
										<button
											type="button"
											className="ref-settings-bot-chip-btn"
											onClick={() => setExpandedId(expanded ? null : current.id)}
										>
											{expanded ? (zh ? '收起' : 'Collapse') : zh ? '展开' : 'Expand'}
										</button>
										<button
											type="button"
											className="ref-settings-bot-chip-btn is-danger"
											onClick={() => removeOne(current.id)}
										>
											{zh ? '删除' : 'Remove'}
										</button>
									</div>
								</div>

								<div className="ref-settings-bot-badges">
									<span className="ref-settings-bot-badge">{current.defaultMode ?? 'agent'}</span>
									<span className="ref-settings-bot-badge">{modelText}</span>
									<span className="ref-settings-bot-badge">{summary.workspace}</span>
									<span className="ref-settings-bot-badge">{summary.access}</span>
								</div>

								<div className="ref-settings-bot-overview">
									<div className="ref-settings-bot-overview-item">
										<span>{zh ? '工作区' : 'Workspace'}</span>
										<strong>{summary.workspace}</strong>
									</div>
									<div className="ref-settings-bot-overview-item">
										<span>{zh ? '目标过滤' : 'Target filtering'}</span>
										<strong>{summary.access}</strong>
									</div>
									<div className="ref-settings-bot-overview-item">
										<span>{zh ? '桥接提示' : 'Bridge prompt'}</span>
										<strong>{summary.prompt}</strong>
									</div>
								</div>

								{expanded ? (
									<div className="ref-settings-bot-editor">
										<div className="ref-settings-bot-tip">{zh ? meta.tipZh : meta.tipEn}</div>

										<section className="ref-settings-bot-section">
											<div className="ref-settings-bots-section-head">
												<div>
													<div className="ref-settings-bots-section-kicker">{zh ? 'Runtime' : 'Runtime'}</div>
													<h5 className="ref-settings-bots-section-title">{zh ? '会话默认值' : 'Session defaults'}</h5>
												</div>
												<p className="ref-settings-bots-section-copy">
													{zh
														? '决定机器人收到消息后，默认在哪个工作区、用哪个模型和模式开始执行。'
														: 'Choose the workspace, model, and mode the bot should start from before it handles a message.'}
												</p>
											</div>
											<div className="ref-settings-bot-grid ref-settings-bot-grid--runtime">
												<label className="ref-settings-field">
													<span>{zh ? '显示名称' : 'Display name'}</span>
													<input
														type="text"
														value={current.name}
														onChange={(event) => updateOne(current.id, { name: event.target.value })}
														placeholder={zh ? '例如：研发值班机器人' : 'Example: Incident Bot'}
													/>
												</label>
												<label className="ref-settings-field">
													<span>{zh ? '平台' : 'Platform'}</span>
													<VoidSelect
														value={current.platform}
														onChange={(next) =>
															updateOne(current.id, ensurePlatformShape(current, next as BotPlatform))
														}
														options={(Object.keys(PLATFORM_META) as BotPlatform[]).map((platform) => ({
															value: platform,
															label: platformLabel(platform, zh),
														}))}
														ariaLabel={zh ? '机器人平台' : 'Bot platform'}
													/>
												</label>
												<label className="ref-settings-field">
													<span>{zh ? '默认模型' : 'Default model'}</span>
													<VoidSelect
														value={current.defaultModelId ?? ''}
														onChange={(next) => updateOne(current.id, { defaultModelId: String(next ?? '') })}
														options={modelOptions}
														ariaLabel={zh ? '默认模型' : 'Default model'}
													/>
													<p className="ref-settings-field-hint">
														{zh
															? '建议选择支持 tool_call 的 OpenAI 兼容或 Anthropic 模型。'
															: 'Prefer a tool-capable OpenAI-compatible or Anthropic model.'}
													</p>
												</label>
												<label className="ref-settings-field">
													<span>{zh ? '默认模式' : 'Default mode'}</span>
													<VoidSelect
														value={current.defaultMode ?? 'agent'}
														onChange={(next) => updateOne(current.id, { defaultMode: next as BotComposerMode })}
														options={MODE_OPTIONS}
														ariaLabel={zh ? '默认模式' : 'Default mode'}
													/>
												</label>
											</div>
										</section>

										<section className="ref-settings-bot-section">
											<div className="ref-settings-bots-section-head">
												<div>
													<div className="ref-settings-bots-section-kicker">{zh ? 'Scope' : 'Scope'}</div>
													<h5 className="ref-settings-bots-section-title">{zh ? '工作区与访问范围' : 'Workspaces and access'}</h5>
												</div>
												<p className="ref-settings-bots-section-copy">
													{zh
														? '这里限制 bot 可以切换到哪些工作区，以及它应该在哪些对话/频道里响应。'
														: 'Constrain which workspaces the bot can switch into, and where it should be allowed to respond.'}
												</p>
											</div>
											<div className="ref-settings-bot-grid">
												<label className="ref-settings-field">
													<span>{zh ? '默认工作区' : 'Default workspace'}</span>
													<input
														type="text"
														value={current.defaultWorkspaceRoot ?? ''}
														onChange={(event) => updateOne(current.id, { defaultWorkspaceRoot: event.target.value })}
														placeholder={zh ? '绝对路径，例如 D:\\Projects\\Repo' : 'Absolute path, e.g. D:\\Projects\\Repo'}
													/>
												</label>
												<label className="ref-settings-field">
													<span>{zh ? '附加可访问工作区（每行一个）' : 'Additional workspace roots (one per line)'}</span>
													<textarea
														value={textFromLines(current.workspaceRoots)}
														onChange={(event) => updateOne(current.id, { workspaceRoots: linesFromText(event.target.value) })}
														placeholder={
															zh
																? '留空时仍会自动合并最近打开过的工作区'
																: 'Recent workspaces will still be considered when this is empty'
														}
													/>
												</label>
											</div>
										</section>

										<section className="ref-settings-bot-section">
											<div className="ref-settings-bots-section-head">
												<div>
													<div className="ref-settings-bots-section-kicker">{platformLabel(current.platform, zh)}</div>
													<h5 className="ref-settings-bots-section-title">{zh ? '平台接入信息' : 'Platform connection'}</h5>
												</div>
												<p className="ref-settings-bots-section-copy">
													{zh
														? '填写平台凭据，以及需要响应的 chat / channel 范围。'
														: 'Fill in platform credentials and the chat or channel scope this bot should listen to.'}
												</p>
											</div>

											{current.platform === 'telegram' ? (
												<div className="ref-settings-bot-grid">
													<label className="ref-settings-field">
														<span>Bot Token</span>
														<input
															type="password"
															value={current.telegram?.botToken ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	telegram: { ...(current.telegram ?? {}), botToken: event.target.value },
																})
															}
															placeholder="123456:ABC..."
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? '允许的 Chat ID（每行一个）' : 'Allowed chat IDs (one per line)'}</span>
														<textarea
															value={textFromLines(current.telegram?.allowedChatIds)}
															onChange={(event) =>
																updateOne(current.id, {
																	telegram: {
																		...(current.telegram ?? {}),
																		allowedChatIds: linesFromText(event.target.value),
																	},
																})
															}
														/>
													</label>
													<label className="ref-settings-bot-inline-check">
														<input
															type="checkbox"
															checked={current.telegram?.requireMentionInGroups !== false}
															onChange={(event) =>
																updateOne(current.id, {
																	telegram: {
																		...(current.telegram ?? {}),
																		requireMentionInGroups: event.target.checked,
																	},
																})
															}
														/>
														<span>{zh ? '群聊里必须显式 @ 机器人' : 'Require @mentions in group chats'}</span>
													</label>
												</div>
											) : null}

											{current.platform === 'slack' ? (
												<div className="ref-settings-bot-grid">
													<label className="ref-settings-field">
														<span>Bot Token</span>
														<input
															type="password"
															value={current.slack?.botToken ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	slack: { ...(current.slack ?? {}), botToken: event.target.value },
																})
															}
															placeholder="xoxb-..."
														/>
													</label>
													<label className="ref-settings-field">
														<span>App Token</span>
														<input
															type="password"
															value={current.slack?.appToken ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	slack: { ...(current.slack ?? {}), appToken: event.target.value },
																})
															}
															placeholder="xapp-..."
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? '允许的 Channel ID（每行一个）' : 'Allowed channel IDs (one per line)'}</span>
														<textarea
															value={textFromLines(current.slack?.allowedChannelIds)}
															onChange={(event) =>
																updateOne(current.id, {
																	slack: {
																		...(current.slack ?? {}),
																		allowedChannelIds: linesFromText(event.target.value),
																	},
																})
															}
														/>
													</label>
												</div>
											) : null}

											{current.platform === 'discord' ? (
												<div className="ref-settings-bot-grid">
													<label className="ref-settings-field">
														<span>Bot Token</span>
														<input
															type="password"
															value={current.discord?.botToken ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	discord: { ...(current.discord ?? {}), botToken: event.target.value },
																})
															}
															placeholder="Bot token"
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? '允许的 Channel ID（每行一个）' : 'Allowed channel IDs (one per line)'}</span>
														<textarea
															value={textFromLines(current.discord?.allowedChannelIds)}
															onChange={(event) =>
																updateOne(current.id, {
																	discord: {
																		...(current.discord ?? {}),
																		allowedChannelIds: linesFromText(event.target.value),
																	},
																})
															}
														/>
													</label>
													<label className="ref-settings-bot-inline-check">
														<input
															type="checkbox"
															checked={current.discord?.requireMentionInGuilds !== false}
															onChange={(event) =>
																updateOne(current.id, {
																	discord: {
																		...(current.discord ?? {}),
																		requireMentionInGuilds: event.target.checked,
																	},
																})
															}
														/>
														<span>{zh ? '服务器频道里必须显式提及机器人' : 'Require mentions in guild channels'}</span>
													</label>
												</div>
											) : null}

											{current.platform === 'feishu' ? (
												<div className="ref-settings-bot-grid">
													<label className="ref-settings-field">
														<span>App ID</span>
														<input
															type="text"
															value={current.feishu?.appId ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	feishu: { ...(current.feishu ?? {}), appId: event.target.value },
																})
															}
														/>
													</label>
													<label className="ref-settings-field">
														<span>App Secret</span>
														<input
															type="password"
															value={current.feishu?.appSecret ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	feishu: { ...(current.feishu ?? {}), appSecret: event.target.value },
																})
															}
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? 'Encrypt Key（可选）' : 'Encrypt key (optional)'}</span>
														<input
															type="password"
															value={current.feishu?.encryptKey ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	feishu: { ...(current.feishu ?? {}), encryptKey: event.target.value },
																})
															}
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? 'Verification Token（可选）' : 'Verification token (optional)'}</span>
														<input
															type="password"
															value={current.feishu?.verificationToken ?? ''}
															onChange={(event) =>
																updateOne(current.id, {
																	feishu: { ...(current.feishu ?? {}), verificationToken: event.target.value },
																})
															}
														/>
													</label>
													<label className="ref-settings-field">
														<span>{zh ? '允许的 Chat ID（每行一个）' : 'Allowed chat IDs (one per line)'}</span>
														<textarea
															value={textFromLines(current.feishu?.allowedChatIds)}
															onChange={(event) =>
																updateOne(current.id, {
																	feishu: {
																		...(current.feishu ?? {}),
																		allowedChatIds: linesFromText(event.target.value),
																	},
																})
															}
														/>
													</label>
												</div>
											) : null}
										</section>

										<section className="ref-settings-bot-section">
											<div className="ref-settings-bots-section-head">
												<div>
													<div className="ref-settings-bots-section-kicker">{zh ? 'Persona' : 'Persona'}</div>
													<h5 className="ref-settings-bots-section-title">{zh ? '桥接层额外系统提示' : 'Extra bridge prompt'}</h5>
												</div>
												<p className="ref-settings-bots-section-copy">
													{zh
														? '这里只影响外部 bot 的桥接行为，比如默认语气、禁止事项、特定场景下的工作区切换偏好。'
														: 'This only shapes the bridge behavior itself, such as tone, hard constraints, or workspace-selection preferences.'}
												</p>
											</div>
											<label className="ref-settings-field">
												<span>{zh ? '额外系统提示（可选）' : 'Extra system prompt (optional)'}</span>
												<textarea
													value={current.systemPrompt ?? ''}
													onChange={(event) => updateOne(current.id, { systemPrompt: event.target.value })}
													placeholder={
														zh
															? '例如：优先把需求拆成执行步骤，再调用 run_async_task；对生产环境变更更保守。'
															: 'Example: prefer breaking requests into steps before run_async_task; be conservative around production changes.'
													}
												/>
											</label>
										</section>
									</div>
								) : null}
							</article>
						);
					})}
				</div>
			</div>
		</div>
	);
}
