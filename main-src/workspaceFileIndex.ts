import * as fs from 'node:fs';
import * as path from 'node:path';

/** 遍历时跳过的目录名（小写比较） */
const SKIP_DIR_NAMES = new Set([
	'.git',
	'node_modules',
	'.venv',
	'venv',
	'dist',
	'build',
	'out',
	'coverage',
	'__pycache__',
	'.idea',
	'.vs',
	'target',
	'.next',
	'.nuxt',
	'Pods',
	'.gradle',
	'DerivedData',
]);

const MAX_FILES = 12_000;

/**
 * 返回工作区内所有文件的相对路径（POSIX `/`），按路径排序。
 */
export function listWorkspaceRelativeFiles(rootAbs: string): string[] {
	const root = path.normalize(rootAbs);
	const out: string[] = [];

	function walk(absDir: string): void {
		if (out.length >= MAX_FILES) {
			return;
		}
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(absDir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			if (out.length >= MAX_FILES) {
				return;
			}
			const name = ent.name;
			if (name === '.' || name === '..') {
				continue;
			}
			const abs = path.join(absDir, name);
			if (ent.isDirectory()) {
				if (SKIP_DIR_NAMES.has(name.toLowerCase())) {
					continue;
				}
				walk(abs);
			} else if (ent.isFile()) {
				const rel = path.relative(root, abs);
				if (rel && !rel.startsWith('..')) {
					out.push(rel.split(path.sep).join('/'));
				}
			}
		}
	}

	try {
		const st = fs.statSync(root);
		if (!st.isDirectory()) {
			return [];
		}
	} catch {
		return [];
	}

	walk(root);
	out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
	return out;
}
