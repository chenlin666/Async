export function extractTeamLeadNarrative(summary: string): string {
	const text = String(summary ?? '').trim();
	if (!text) {
		return '';
	}
	const withoutJsonFence = text.replace(/```json[\s\S]*?```/gi, '').trim();
	const withoutAnyFence = withoutJsonFence.replace(/```[\s\S]*?```/g, '').trim();
	return (withoutAnyFence || withoutJsonFence || text).replace(/\n{3,}/g, '\n\n').trim();
}
