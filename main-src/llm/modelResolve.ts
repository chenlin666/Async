import type { ModelRequestParadigm, ShellSettings, UserModelEntry } from '../settingsStore.js';

export type ResolvedChatModel = {
	requestModelId: string;
	paradigm: ModelRequestParadigm;
};

function entryById(entries: UserModelEntry[], id: string): UserModelEntry | undefined {
	return entries.find((e) => e.id === id);
}

function isUsable(e: UserModelEntry): boolean {
	return e.requestName.trim().length > 0;
}

/**
 * @param selectionId `auto` 或用户模型条目的 id
 */
export function resolveChatModel(settings: ShellSettings, selectionId: string): ResolvedChatModel | null {
	const entries = settings.models?.entries ?? [];
	const enabledIds = settings.models?.enabledIds ?? [];
	const enabledSet = new Set(enabledIds);

	const pickFirstAuto = (): ResolvedChatModel | null => {
		for (const id of enabledIds) {
			const e = entryById(entries, id);
			if (e && isUsable(e)) {
				return { requestModelId: e.requestName.trim(), paradigm: e.paradigm };
			}
		}
		return null;
	};

	const sid = selectionId.trim().toLowerCase();
	if (sid === 'auto' || sid === '') {
		return pickFirstAuto();
	}

	const e = entryById(entries, selectionId);
	if (!e || !enabledSet.has(e.id) || !isUsable(e)) {
		return null;
	}
	return { requestModelId: e.requestName.trim(), paradigm: e.paradigm };
}
