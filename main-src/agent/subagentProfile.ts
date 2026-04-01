/**
 * 子 Agent 类型解析：对齐 Claude Code 的 subagent_type + 设置中的 AgentSubagent。
 */

import type { ShellSettings } from '../settingsStore.js';

export type SubagentRunProfile = 'explore' | 'full';

const EXPLORE_ALIASES = new Set(['explore', 'explore_agent', 'codebase_explore']);

/**
 * 根据 subagent_type 字符串决定子循环是只读探索还是完整工具。
 */
export function resolveSubagentProfile(rawType: string | undefined): SubagentRunProfile {
	const t = (rawType ?? '').trim().toLowerCase().replace(/\s+/g, '_');
	if (!t) return 'full';
	if (EXPLORE_ALIASES.has(t)) return 'explore';
	return 'full';
}

/**
 * 追加到子 Agent 系统提示的片段（在父级 agentSystemAppend 之后）。
 */
export function buildSubagentSystemAppend(settings: ShellSettings, rawType: string | undefined): string | undefined {
	const t = (rawType ?? '').trim();
	const lower = t.toLowerCase().replace(/\s+/g, '_');
	if (!t) return undefined;

	if (EXPLORE_ALIASES.has(lower)) {
		return [
			'## Subagent profile: explore',
			'You only have read-oriented tools (no file writes, no shell execute).',
			'Search and read the codebase thoroughly, then summarize findings in your final reply.',
		].join('\n');
	}

	const subs = settings.agent?.subagents ?? [];
	const match = subs.find(
		(s) =>
			s.enabled !== false &&
			(s.id === t ||
				s.name.trim().toLowerCase() === t.toLowerCase() ||
				s.name.trim().toLowerCase().replace(/\s+/g, '_') === lower)
	);
	if (match) {
		return [`## Subagent: ${match.name}`, match.description.trim(), '', match.instructions.trim()].filter(Boolean).join('\n');
	}

	return [`## Subagent type: ${t}`, 'Complete the task using the tools available to you.'].join('\n');
}
