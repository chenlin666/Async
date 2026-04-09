import { forwardRef, useCallback } from 'react';
import { AgentCommandPermissionDropdown, type CommandPermissionMode } from './AgentCommandPermissionDropdown';
import type { AgentCustomization } from './agentSettingsTypes';
import {
	useAppShellChrome,
	useAppShellGitActions,
	useAppShellGitMeta,
	useAppShellSettings,
} from './app/appShellContexts';
import {
	classifyGitUnavailableReason,
	gitBranchTriggerTitle,
	type GitUnavailableReason,
} from './gitAvailability';
import { IconChevron, IconGitSCM } from './icons';

function shellCommandPermissionMode(agent: AgentCustomization | undefined): CommandPermissionMode {
	return agent?.confirmShellCommands === false ? 'always' : 'ask';
}

export type ComposerGitBranchRowProps = {
	/** 打开分支菜单前关闭 + / 模型浮层（与原先 App 内联行为一致） */
	onBeforeToggleGitBranchPicker?: () => void;
};

/**
 * 输入区 Git 分支行：订阅 Git Meta / Settings，不经过 App 的 sharedComposerProps，
 * 避免 fullStatus 等更新时整份 composer props 引用失效。
 */
export const ComposerGitBranchRow = forwardRef<HTMLButtonElement, ComposerGitBranchRowProps>(
	function ComposerGitBranchRow({ onBeforeToggleGitBranchPicker }, ref) {
		const { shell, t } = useAppShellChrome();
		const { gitBranch, gitLines, gitStatusOk, gitBranchPickerOpen } = useAppShellGitMeta();
		const { setGitBranchPickerOpen } = useAppShellGitActions();
		const { agentCustomization, setAgentCustomization } = useAppShellSettings();

		const gitUnavailableReason: GitUnavailableReason = gitStatusOk
			? 'none'
			: classifyGitUnavailableReason(gitLines[0]);
		const commandPermissionMode = shellCommandPermissionMode(agentCustomization);

		const onChangeCommandPermissionMode = useCallback(
			async (mode: CommandPermissionMode) => {
				const patch: Partial<AgentCustomization> =
					mode === 'always'
						? { confirmShellCommands: false }
						: {
								confirmShellCommands: true,
								skipSafeShellCommandsConfirm: false,
							};
				setAgentCustomization((prev) => ({ ...prev, ...patch }));
				if (!shell) {
					return;
				}
				await shell.invoke('settings:set', { agent: patch });
			},
			[shell, setAgentCustomization]
		);

		return (
			<div className="ref-composer-git-branch-row">
				<AgentCommandPermissionDropdown
					value={commandPermissionMode}
					onChange={(mode) => void onChangeCommandPermissionMode(mode)}
					askLabel={t('agent.commandPermission.ask')}
					alwaysLabel={t('agent.commandPermission.always')}
					ariaLabel={t('agent.commandPermission.aria')}
					disabled={!shell}
				/>
				<button
					ref={ref}
					type="button"
					className="ref-composer-git-branch-trigger"
					title={gitBranchTriggerTitle(t, gitStatusOk, gitUnavailableReason)}
					aria-label={`${t('app.tabGit')}: ${gitBranch}`}
					aria-expanded={gitBranchPickerOpen}
					aria-haspopup="dialog"
					disabled={!gitStatusOk}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onBeforeToggleGitBranchPicker?.();
						if (!gitStatusOk) {
							return;
						}
						setGitBranchPickerOpen((o) => !o);
					}}
				>
					<IconGitSCM className="ref-composer-git-branch-ico" aria-hidden />
					<span className="ref-composer-git-branch-name">{gitBranch}</span>
					<IconChevron className="ref-composer-git-branch-chev" aria-hidden />
				</button>
			</div>
		);
	}
);
