import type { TFunction } from './types';

/** 主进程 / Agent 循环发出的固定中文错误 → 词典 key */
const CHAT_ERROR_TO_KEY: Record<string, string> = {
	'未配置 OpenAI 兼容 API Key。请在设置 → Models → API Keys 中填写。': 'errors.noOpenAIKey',
	'未配置 Anthropic API Key。请在设置 → Models → API Keys 中填写。': 'errors.noAnthropicKey',
	'模型请求名称为空。请在 Models 中编辑该模型的「请求名称」。': 'errors.modelNameEmpty',
	'模型请求名称为空。': 'errors.modelNameEmpty',
	'代理地址无效。': 'errors.proxyInvalid',
	'没有可发送的对话消息。': 'errors.noMessages',
	'无法解析当前模型：请在 Models 中至少添加并启用一条模型，填写「请求名称」并选择请求范式；若选 Auto，请确保已启用列表中有可用项。':
		'errors.modelResolve',
};

export function translateChatError(raw: string, t: TFunction): string {
	const key = CHAT_ERROR_TO_KEY[raw.trim()];
	if (key) {
		return t(key);
	}
	return raw;
}
