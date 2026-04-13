import { memo } from 'react';
import { ChatMarkdown } from './ChatMarkdown';
import type { TFunction } from './i18n';
import type { TeamSessionState } from './hooks/useTeamSession';
import { buildTeamWorkflowItems, getTeamWorkflowItemById } from './teamWorkflowItems';

type Props = {
	t: TFunction;
	session: TeamSessionState | null;
	selectedTaskId: string | null;
	onSelectTask: (taskId: string) => void;
	layout: 'agent-sidebar' | 'editor-center';
};

function buildPromptPacket(t: TFunction, session: TeamSessionState, taskId: string) {
	const item = getTeamWorkflowItemById(session, taskId);
	if (!item) {
		return '';
	}

	const dependencyNames =
		item.dependencies.length > 0
			? item.dependencies
					.map((dependencyId) => session.tasks.find((task) => task.id === dependencyId)?.expertName ?? dependencyId)
					.join('\n- ')
			: t('team.timeline.noDependencies');
	const acceptanceCriteria =
		item.acceptanceCriteria.length > 0
			? item.acceptanceCriteria.join('\n- ')
			: t('team.timeline.noAcceptanceCriteria');
	const planSummary = session.leaderMessage.trim() || session.planSummary.trim() || t('team.timeline.kickoffFallback');

	if (item.roleKind === 'reviewer') {
		const reviewerFocus = session.tasks
			.map((task) => `- ${task.expertName}: ${task.description}`)
			.join('\n');
		return [
			`## ${t('team.timeline.originalRequest')}`,
			session.originalUserRequest || t('team.timeline.kickoffFallback'),
			'',
			`## ${t('team.timeline.planSummary')}`,
			planSummary,
			'',
			`## ${t('team.timeline.reviewFocus')}`,
			reviewerFocus || t('team.timeline.preparing'),
		].join('\n');
	}

	return [
		`## ${t('team.timeline.originalRequest')}`,
		session.originalUserRequest || t('team.timeline.kickoffFallback'),
		'',
		`## ${t('team.timeline.planSummary')}`,
		planSummary,
		'',
		`## ${t('team.timeline.assignedTask')}`,
		item.description,
		'',
		`## ${t('team.timeline.acceptanceCriteria')}`,
		`- ${acceptanceCriteria}`,
		'',
		`## ${t('team.timeline.dependencies')}`,
		`- ${dependencyNames}`,
	].join('\n');
}

export const TeamRoleWorkflowPanel = memo(function TeamRoleWorkflowPanel({
	t,
	session,
	selectedTaskId,
	onSelectTask,
	layout,
}: Props) {
	if (!session) {
		return (
			<div className="ref-team-role-panel ref-team-role-panel--empty">
				<div className="ref-agent-plan-status-main">
					<div className="ref-agent-plan-status-title">{t('composer.mode.team')}</div>
					<p className="ref-agent-plan-status-body">{t('settings.team.empty')}</p>
				</div>
			</div>
		);
	}

	const item = getTeamWorkflowItemById(session, selectedTaskId ?? session.selectedTaskId);
	if (!item) {
		return (
			<div className="ref-team-role-panel ref-team-role-panel--empty">
				<div className="ref-agent-plan-status-main">
					<div className="ref-agent-plan-status-title">{t('composer.mode.team')}</div>
					<p className="ref-agent-plan-status-body">{t('app.selectFileToView')}</p>
				</div>
			</div>
		);
	}

	const workflowItems = buildTeamWorkflowItems(session);
	const workflow = item.workflow;
	const isWorking = workflow?.awaitingReply ?? item.status === 'in_progress';
	const lastMessage = workflow?.messages[workflow.messages.length - 1]?.content;
	const assistantContent = lastMessage || item.result || '';
	const promptPacket = buildPromptPacket(t, session, item.id);
	const liveThoughtMeta =
		workflow?.awaitingReply || workflow?.streamingThinking
			? {
					phase: (workflow?.streaming?.trim() ? 'streaming' : 'thinking') as 'thinking' | 'streaming' | 'done',
					elapsedSeconds: 0,
					streamingThinking: workflow?.streamingThinking ?? '',
					tokenUsage: workflow?.lastTurnUsage ?? null,
				}
			: workflow?.lastTurnUsage
				? {
						phase: 'done' as const,
						elapsedSeconds: 0,
						streamingThinking: '',
						tokenUsage: workflow.lastTurnUsage,
					}
				: null;

	return (
		<section className={`ref-team-role-panel ref-team-role-panel--${layout}`}>
			<div className="ref-team-role-panel-head">
				<div className="ref-team-role-panel-title-stack">
					<span className="ref-team-role-panel-kicker">
						{t(`team.timeline.role.${item.roleKind}`)}
					</span>
					<strong className="ref-team-role-panel-title">{item.expertName}</strong>
					<span className="ref-team-role-panel-subtitle">{item.description}</span>
				</div>
				<div className="ref-team-role-panel-meta">
					<span className={`ref-team-expert-status ref-team-expert-status--${item.status}`}>
						{item.status === 'in_progress' ? <span className="ref-team-pulse" /> : null}
						{t(`team.timeline.status.${item.status}`)}
					</span>
				</div>
			</div>

			{layout === 'editor-center' && workflowItems.length > 1 ? (
				<div className="ref-team-role-panel-switcher">
					{workflowItems.map((entry) => (
						<button
							key={entry.id}
							type="button"
							className={`ref-team-role-switch ${entry.id === item.id ? 'is-active' : ''}`}
							onClick={() => onSelectTask(entry.id)}
						>
							{entry.expertName}
						</button>
					))}
				</div>
			) : null}

			<div className="ref-team-role-panel-body">
				<div className="ref-team-transcript">
					<div className="ref-msg-slot ref-msg-slot--user ref-team-role-msg">
						<div className="ref-bubble-wrap ref-bubble-wrap--user">
							<div className="ref-bubble ref-bubble--user ref-team-role-user-bubble">
								<div className="ref-team-role-caption">{t('team.timeline.requestPacket')}</div>
								<ChatMarkdown content={promptPacket} />
							</div>
						</div>
					</div>

					<div className="ref-msg-slot ref-msg-slot--assistant ref-team-role-msg">
						<div className="ref-bubble-wrap">
							<div className="ref-bubble ref-bubble--assistant ref-team-role-assistant-bubble">
								{assistantContent || workflow?.liveBlocks.blocks.length || isWorking ? (
									<ChatMarkdown
										content={assistantContent}
										agentUi
										workspaceRoot={null}
										showAgentWorking={isWorking}
										liveAgentBlocksState={workflow?.liveBlocks ?? null}
										liveThoughtMeta={liveThoughtMeta}
									/>
								) : (
									<div className="ref-team-role-empty-state">
										{t('team.timeline.pendingTrace', { name: item.expertName })}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
});
