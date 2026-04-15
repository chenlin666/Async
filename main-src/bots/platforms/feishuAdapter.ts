import * as fs from 'node:fs';
import * as path from 'node:path';
import * as lark from '@larksuiteoapi/node-sdk';
import type { BotIntegrationConfig } from '../../botSettingsTypes.js';
import type { BotPlatformAdapter, BotTodoListItem, PlatformMessageHandler, StreamReplyCallbacks } from './common.js';
import { createJsonHttpInstance, createProxyAgent, resolveIntegrationProxyUrl, splitPlainText } from './common.js';
import { FeishuCardKitClient, FeishuStreamingSession } from './feishuCardKit.js';

const FEISHU_MESSAGE_DEDUP_TTL_MS = 10 * 60 * 1000;

type FeishuSenderId = {
	open_id?: string;
	user_id?: string;
	union_id?: string;
};

type FeishuSender = {
	sender_id?: FeishuSenderId;
	sender_type?: string;
};

type FeishuMessage = {
	message_id?: string;
	chat_id?: string;
	chat_type?: string;
	message_type?: string;
	content?: unknown;
};

function parseFeishuText(raw: unknown): string {
	try {
		const parsed = JSON.parse(String(raw ?? '')) as { text?: string };
		return String(parsed.text ?? '').trim();
	} catch {
		return '';
	}
}

function collectSenderIds(raw: { open_id?: string; user_id?: string; union_id?: string } | undefined): string[] {
	const ids = [raw?.open_id, raw?.user_id, raw?.union_id]
		.map((value) => String(value ?? '').trim())
		.filter(Boolean);
	return [...new Set(ids)];
}

function normalizeBotTodos(raw: BotTodoListItem[]): BotTodoListItem[] {
	return raw
		.map((todo) => ({
			content: String(todo.content ?? '').trim(),
			status:
				todo.status === 'completed' || todo.status === 'in_progress' || todo.status === 'pending'
					? todo.status
					: 'pending',
			activeForm: String(todo.activeForm ?? '').trim() || undefined,
		}))
		.filter((todo) => todo.content);
}

function feishuFileTypeForPath(filePath: string): 'opus' | 'mp4' | 'pdf' | 'doc' | 'xls' | 'ppt' | 'stream' {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.opus') return 'opus';
	if (ext === '.mp4') return 'mp4';
	if (ext === '.pdf') return 'pdf';
	if (ext === '.doc' || ext === '.docx') return 'doc';
	if (ext === '.xls' || ext === '.xlsx' || ext === '.csv') return 'xls';
	if (ext === '.ppt' || ext === '.pptx') return 'ppt';
	return 'stream';
}

export function buildFeishuReplyPayload(messageId: string, text: string) {
	return {
		path: { message_id: messageId },
		data: {
			content: JSON.stringify({ text }),
			msg_type: 'text',
		},
	};
}

export function extractFeishuMessageEvent(
	raw: unknown
): { sender?: FeishuSender; message?: FeishuMessage } | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const root = raw as { event?: unknown; sender?: FeishuSender; message?: FeishuMessage };
	const payload =
		root.event && typeof root.event === 'object'
			? (root.event as { sender?: FeishuSender; message?: FeishuMessage })
			: root;
	return {
		sender: payload.sender,
		message: payload.message,
	};
}

export class FeishuBotAdapter implements BotPlatformAdapter {
	private wsClient: lark.WSClient | null = null;
	private client: lark.Client | null = null;
	private cardKitClient: FeishuCardKitClient | null = null;
	private readonly recentMessageIds = new Map<string, number>();

	constructor(private readonly integration: BotIntegrationConfig) {}

	private isAllowedChat(chatId: string): boolean {
		const allowed = this.integration.allowedReplyChatIds?.length
			? this.integration.allowedReplyChatIds
			: (this.integration.feishu?.allowedChatIds ?? []);
		return allowed.length === 0 || allowed.includes(chatId);
	}

	private isAllowedUser(userIds: string[]): boolean {
		const allowed = this.integration.allowedReplyUserIds ?? [];
		return allowed.length === 0 || userIds.some((userId) => allowed.includes(userId));
	}

	private shouldProcessMessage(messageId: string): boolean {
		const trimmed = messageId.trim();
		if (!trimmed) {
			return true;
		}
		const now = Date.now();
		for (const [knownId, ts] of this.recentMessageIds.entries()) {
			if (now - ts > FEISHU_MESSAGE_DEDUP_TTL_MS) {
				this.recentMessageIds.delete(knownId);
			}
		}
		if (this.recentMessageIds.has(trimmed)) {
			return false;
		}
		this.recentMessageIds.set(trimmed, now);
		return true;
	}

	async start(onMessage: PlatformMessageHandler): Promise<void> {
		const appId = this.integration.feishu?.appId?.trim() ?? '';
		const appSecret = this.integration.feishu?.appSecret?.trim() ?? '';
		if (!appId || !appSecret) {
			return;
		}
		const proxyUrl = resolveIntegrationProxyUrl(this.integration);
		const httpInstance = createJsonHttpInstance(proxyUrl);
		const proxyAgent = createProxyAgent(proxyUrl);
		this.client = new lark.Client({ appId, appSecret, httpInstance });

		const encryptKey = this.integration.feishu?.encryptKey?.trim() || undefined;
		const eventDispatcher = new lark.EventDispatcher({
			...(encryptKey ? { encryptKey } : {}),
		});

		const useStreamingCard = this.integration.feishu?.streamingCard !== false;
		if (useStreamingCard) {
			this.cardKitClient = new FeishuCardKitClient({ appId, appSecret, proxyUrl });
		}

		eventDispatcher.register({
			'im.message.receive_v1': async (data) => {
				const event = extractFeishuMessageEvent(data);
				const message = event?.message;
				if (!message || message.message_type !== 'text') {
					return;
				}
				const chatId = String(message.chat_id ?? '').trim();
				const senderIds = collectSenderIds(event?.sender?.sender_id);
				const senderId = senderIds[0] ?? '';
				if (!this.isAllowedUser(senderIds)) {
					return;
				}
				const chatType = String(message.chat_type ?? '').trim().toLowerCase();
				const isGroupChat = chatType !== '' && chatType !== 'p2p';
				if (isGroupChat && !this.isAllowedChat(chatId)) {
					return;
				}
				const text = parseFeishuText(message.content);
				if (!text) {
					return;
				}

				const messageId = String(message.message_id ?? '');
				if (!this.shouldProcessMessage(messageId)) {
					return;
				}

				// Build streaming callbacks if CardKit is enabled
				let streamReply: StreamReplyCallbacks | undefined;
				if (this.cardKitClient) {
					const session = new FeishuStreamingSession(this.cardKitClient);
					streamReply = {
						onStart: async () => {
							await session.start(chatId, messageId);
						},
						onDelta: async (fullText) => {
							if (session.isFailed) return;
							session.update(fullText);
						},
						onToolStatus: (name, state, detail) => {
							if (session.isFailed) return;
							session.setToolStatus(name, state, detail);
						},
						onTodoUpdate: (todos) => {
							if (session.isFailed) return;
							session.setTodos(normalizeBotTodos(todos));
						},
						onDone: async (fullText) => {
							if (session.isFailed) {
								// Fallback to plain text
								await this.replyPlainText(messageId, fullText);
								return;
							}
							await session.close(fullText);
						},
						onError: async (error) => {
							if (session.isActive) {
								await session.close(`❌ ${error}`);
							} else {
								await this.replyPlainText(messageId, `❌ ${error}`);
							}
						},
					};
				}

				void onMessage({
					conversationKey: chatId,
					text,
					senderId: senderId || undefined,
					senderName: String(event?.sender?.sender_type ?? '').trim() || undefined,
					reply: async (replyText) => {
						await this.replyPlainText(messageId, replyText);
					},
					replyImage: async (filePath) => {
						await this.replyImage(messageId, filePath);
					},
					replyFile: async (filePath) => {
						await this.replyFile(messageId, filePath);
					},
					streamReply,
				}).catch((error) => {
					console.warn('[bots][feishu] async message handling failed', error instanceof Error ? error.message : error);
				});
			},
		});

		this.wsClient = new lark.WSClient({
			appId,
			appSecret,
			appType: lark.AppType.SelfBuild,
			httpInstance,
			agent: proxyAgent,
		});
		this.wsClient.start({ eventDispatcher });
	}

	private async replyPlainText(messageId: string, text: string): Promise<void> {
		if (!this.client) return;
		for (const chunk of splitPlainText(text, 8000)) {
			await this.client.im.message.reply(buildFeishuReplyPayload(messageId, chunk));
		}
	}

	private async replyImage(messageId: string, filePath: string): Promise<void> {
		if (!this.client) return;
		const fullPath = String(filePath ?? '').trim();
		if (!fullPath) {
			throw new Error('截图文件路径为空。');
		}
		const image = fs.readFileSync(fullPath);
		const uploaded = await this.client.im.image.create({
			data: {
				image_type: 'message',
				image,
			},
		});
		const imageKey = String(uploaded?.image_key ?? '').trim();
		if (!imageKey) {
			throw new Error('飞书图片上传失败，未返回 image_key。');
		}
		await this.client.im.message.reply({
			path: { message_id: messageId },
			data: {
				content: JSON.stringify({ image_key: imageKey }),
				msg_type: 'image',
			},
		});
	}

	private async replyFile(messageId: string, filePath: string): Promise<void> {
		if (!this.client) return;
		const fullPath = String(filePath ?? '').trim();
		if (!fullPath) {
			throw new Error('文件路径为空。');
		}
		const file = fs.readFileSync(fullPath);
		const uploaded = await this.client.im.file.create({
			data: {
				file_type: feishuFileTypeForPath(fullPath),
				file_name: path.basename(fullPath),
				file,
			},
		});
		const fileKey = String(uploaded?.file_key ?? '').trim();
		if (!fileKey) {
			throw new Error('飞书文件上传失败，未返回 file_key。');
		}
		await this.client.im.message.reply({
			path: { message_id: messageId },
			data: {
				content: JSON.stringify({ file_key: fileKey }),
				msg_type: 'file',
			},
		});
	}

	async stop(): Promise<void> {
		this.wsClient?.stop();
		this.wsClient = null;
		this.client = null;
		this.cardKitClient = null;
		this.recentMessageIds.clear();
	}
}
