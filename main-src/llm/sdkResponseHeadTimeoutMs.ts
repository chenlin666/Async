/**
 * 与 Claude Code `services/api/client.ts` 第 144 行一致：
 * `parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10)`
 */
export function llmSdkResponseHeadTimeoutMs(): number {
	return parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10);
}
