import { memo } from 'react';
import { ChatMarkdown } from './ChatMarkdown';
import type { TFunction } from './i18n';
import type { TeamSessionState } from './hooks/useTeamSession';
import { getTeamWorkflowItemById } from './teamWorkflowItems';

type Props = {
	t: TFunction;
	session: TeamSessionState | null;
	selectedTaskId: string | null;
	onSelectTask: (taskId: string) => void;
	layout: 'agent-sidebar' | 'editor-center';
};

export const TeamRoleWorkflowPanel = memo(function TeamRoleWorkflowPanel({ t, session, selectedTaskId, onSelectTask, layout }: Props) {
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
	const workflow = item.workflow;
	const isWorking = workflow?.awaitingReply ?? (item.status === 'in_progress');
	const lastMessage = workflow?.messages[workflow.messages.length - 1]?.content;
	const content = lastMessage || item.result || item.description;

	const latestLog = item.logs.length > 0 ? item.logs[item.logs.length - 1] : null;

	return (
		<section className={`ref-team-role-panel ref-team-role-panel--${layout}`}>
			<div className="ref-team-role-panel-head">
				<div className="ref-team-role-panel-title-stack">
					<span className="ref-team-role-panel-kicker">{item.roleKind === 'reviewer' ? 'Reviewer' : t('composer.mode.team')}</span>
					<strong className="ref-team-role-panel-title">{item.expertName}</strong>
					<span className="ref-team-role-panel-subtitle">{item.description}</span>
				</div>
				<div className="ref-team-role-panel-switcher">
					{Object.values(session.roleWorkflowByTaskId).length > 1 || session.tasks.length > 1 ? (
						session.tasks
							.map((task) => ({
								id: task.id,
								label: task.expertName,
							}))
							.concat(
								session.reviewerTaskId
									? [{ id: session.reviewerTaskId, label: session.roleWorkflowByTaskId[session.reviewerTaskId]?.expertName ?? 'Reviewer' }]
									: []
							)
							.filter((entry, index, arr) => arr.findIndex((other) => other.id === entry.id) === index)
							.map((entry) => (
								<button
									key={entry.id}
									type="button"
									className={`ref-team-role-switch ${entry.id === item.id ? 'is-active' : ''}`}
									onClick={() => onSelectTask(entry.id)}
								>
									{entry.label}
								</button>
							))
					) : null}
				</div>
			</div>
			<div className="ref-team-role-panel-body">
				{isWorking ? (
					<div className="ref-team-role-working">
						<span className="ref-team-pulse" />
						<span className="ref-team-role-working-label">{item.expertName} {t('team.phase.executing')}…</span>
						{latestLog ? (
							<p className="ref-team-role-working-log">{latestLog}</p>
						) : null}
					</div>
				) : (
					<ChatMarkdown
						content={content}
						agentUi
						workspaceRoot={null}
						showAgentWorking={false}
					/>
				)}
			</div>
		</section>
	);
});
