/**
 * Parse Plan-mode AI output into structured questions and plan documents.
 *
 * Question block format (AI-produced):
 *   ---QUESTIONS---
 *   <question text>
 *   [A] option text
 *   [B] option text
 *   ---/QUESTIONS---
 *
 * Plan block format:
 *   # Plan: <title>
 *   ## Goal / ## Steps / ## Files to Change / ## Risks ...
 */

export type PlanQuestion = {
	text: string;
	options: { id: string; label: string }[];
};

export type PlanTodoItem = {
	id: string;
	content: string;
	status: 'pending' | 'completed';
};

export type ParsedPlan = {
	name: string;
	overview: string;
	body: string;
	todos: PlanTodoItem[];
};

const Q_OPEN = /---QUESTIONS---/;
const Q_CLOSE = /---\/QUESTIONS---/;
const Q_OPTION = /^\s*\[([A-Z])\]\s+(.+)$/;

export function parseQuestions(text: string): PlanQuestion | null {
	const openMatch = text.match(Q_OPEN);
	const closeMatch = text.match(Q_CLOSE);
	if (!openMatch || !closeMatch) {
		return null;
	}
	const inner = text
		.slice(openMatch.index! + openMatch[0].length, closeMatch.index!)
		.trim();
	if (!inner) {
		return null;
	}

	const lines = inner.split('\n');
	const questionLines: string[] = [];
	const options: { id: string; label: string }[] = [];

	for (const line of lines) {
		const m = line.match(Q_OPTION);
		if (m) {
			options.push({ id: m[1]!, label: m[2]!.trim() });
		} else if (options.length === 0 && line.trim()) {
			questionLines.push(line.trim());
		}
	}

	if (questionLines.length === 0 || options.length < 2) {
		return null;
	}
	return { text: questionLines.join('\n'), options };
}

/**
 * Strip the entire ---QUESTIONS--- block (including content) from the message
 * so the chat bubble only shows the conversational context around it.
 */
export function stripQuestionMarkers(text: string): string {
	return text.replace(/---QUESTIONS---[\s\S]*?---\/QUESTIONS---/g, '').trim();
}

/**
 * Remove the `# Plan:` document from chat when Review Plan panel shows the same content.
 * Keeps any preamble (e.g. short intro before the plan).
 */
export function stripPlanBodyForChatDisplay(text: string): string {
	const noQuestions = stripQuestionMarkers(text);
	const m = noQuestions.match(/^#\s+Plan:\s/im);
	if (!m || m.index === undefined) {
		return noQuestions;
	}
	const preamble = noQuestions.slice(0, m.index).trim();
	return preamble.length > 0
		? preamble
		: '计划已生成，请查看下方 **Review Plan**；完整正文已保存为 `.plan.md`。';
}

const PLAN_HEADING = /^#\s+Plan:\s*(.+)$/m;
const GOAL_SECTION = /^##\s+Goal\s*$/m;
const STEPS_SECTION = /^##\s+Implementation Steps\s*$/m;
const STEP_LINE = /^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/;

export function parsePlanDocument(text: string): ParsedPlan | null {
	const headMatch = text.match(PLAN_HEADING);
	if (!headMatch) {
		return null;
	}

	const name = headMatch[1]!.trim();

	let overview = '';
	const goalIdx = text.search(GOAL_SECTION);
	if (goalIdx >= 0) {
		const afterGoal = text.slice(goalIdx).replace(GOAL_SECTION, '').trim();
		const nextSection = afterGoal.search(/^##\s+/m);
		const goalBlock = nextSection >= 0 ? afterGoal.slice(0, nextSection) : afterGoal;
		overview = goalBlock.trim().split('\n')[0]?.trim() ?? '';
	}

	const todos: PlanTodoItem[] = [];
	const stepsIdx = text.search(STEPS_SECTION);
	if (stepsIdx >= 0) {
		const afterSteps = text.slice(stepsIdx).replace(STEPS_SECTION, '').trim();
		const nextSection = afterSteps.search(/^##\s+/m);
		const stepsBlock = nextSection >= 0 ? afterSteps.slice(0, nextSection) : afterSteps;
		let stepNum = 0;
		for (const line of stepsBlock.split('\n')) {
			const m = line.match(STEP_LINE);
			if (m) {
				stepNum++;
				todos.push({
					id: `step-${stepNum}`,
					content: `${m[1]!.trim()}: ${m[2]!.trim()}`,
					status: 'pending',
				});
			}
		}
	}

	if (todos.length === 0) {
		const numberedStep = /^\d+\.\s+(.+)$/gm;
		let sm: RegExpExecArray | null;
		let stepNum = 0;
		while ((sm = numberedStep.exec(text)) !== null) {
			stepNum++;
			if (stepNum > 20) break;
			todos.push({
				id: `step-${stepNum}`,
				content: sm[1]!.trim().replace(/^\*\*(.+?)\*\*/, '$1'),
				status: 'pending',
			});
		}
	}

	const body = text.slice(headMatch.index!).trim();

	return { name, overview, body, todos };
}

/**
 * Generate YAML-frontmatter .plan.md content.
 */
export function toPlanMd(plan: ParsedPlan): string {
	const yamlTodos = plan.todos
		.map(
			(t) =>
				`  - id: ${t.id}\n    content: ${t.content.replace(/"/g, '\\"')}\n    status: ${t.status}`
		)
		.join('\n');

	return [
		'---',
		`name: ${plan.name}`,
		`overview: ${plan.overview}`,
		'todos:',
		yamlTodos,
		'isProject: false',
		'---',
		'',
		plan.body,
		'',
	].join('\n');
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '_')
		.replace(/-+/g, '-')
		.slice(0, 40)
		.replace(/[_-]+$/, '');
}

export function generatePlanFilename(name: string): string {
	const slug = slugify(name) || 'plan';
	const id = Math.random().toString(16).slice(2, 10);
	return `${slug}_${id}.plan.md`;
}
