import { describe, expect, it } from 'vitest';
import { segmentAssistantContent, segmentAssistantContentUnified } from './agentChatSegments';
import { defaultT } from './i18n';

describe('segmentAssistantContent', () => {
	it('parses streaming_code after tool protocol markers', () => {
		const content = [
			'<tool_call tool="read_file">{"path":"src/App.tsx"}</tool_call>',
			'<tool_result tool="read_file" success="true">  1|import React from \'react\';</tool_result>',
			'这里是正在输出的代码：',
			'```ts',
			'const answer = 42;',
		].join('\n');

		const segs = segmentAssistantContent(content);
		const streaming = segs.find((s) => s.type === 'streaming_code');

		expect(streaming).toBeDefined();
		if (streaming?.type === 'streaming_code') {
			expect(streaming.lang).toBe('ts');
			expect(streaming.body).toContain('const answer = 42;');
		}
	});

	it('shows streaming_code shell immediately when fence has no newline yet', () => {
		const content = [
			'<tool_call tool="list_dir">{"path":"src"}</tool_call>',
			'<tool_result tool="list_dir" success="true">[file] App.tsx</tool_result>',
			'```python',
		].join('\n');

		const segs = segmentAssistantContent(content);
		const streaming = segs.find((s) => s.type === 'streaming_code');

		expect(streaming).toBeDefined();
		if (streaming?.type === 'streaming_code') {
			expect(streaming.lang).toBe('python');
			expect(streaming.body).toBe('');
		}
	});

	it('strips Plan ---QUESTIONS--- block and adds an activity row like tool summaries', () => {
		const text = [
			'先说明上下文。',
			'---QUESTIONS---',
			'选哪种？',
			'[A] 方案甲',
			'[B] 方案乙',
			'---/QUESTIONS---',
		].join('\n');
		const segs = segmentAssistantContent(text, { t: defaultT, planUi: true });
		expect(JSON.stringify(segs)).not.toContain('QUESTIONS');
		expect(segs.some((s) => s.type === 'activity')).toBe(true);
	});

	it('hides incomplete Plan ---QUESTIONS--- block while streaming', () => {
		const text = ['先说明上下文。', '---QUESTIONS---', '选哪种？', '[A] 方案甲'].join('\n');
		const segs = segmentAssistantContent(text, { t: defaultT, planUi: true });
		expect(JSON.stringify(segs)).not.toContain('QUESTIONS');
		expect(segs.some((s) => s.type === 'activity' && s.status === 'pending')).toBe(true);
	});

	it('strips QUESTIONS inside structured assistant JSON text parts', () => {
		const content = JSON.stringify({
			_asyncAssistant: 1,
			v: 1,
			parts: [
				{
					type: 'text',
					text: ['前言', '---QUESTIONS---', 'Q?', '[A] 1', '[B] 2', '---/QUESTIONS---'].join('\n'),
				},
			],
		});
		const segs = segmentAssistantContentUnified(content, { t: defaultT, planUi: true });
		expect(JSON.stringify(segs)).not.toContain('QUESTIONS');
		expect(segs.some((s) => s.type === 'activity')).toBe(true);
	});
});
