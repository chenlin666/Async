import * as path from 'node:path';

let workspaceRoot: string | null = null;

export function setWorkspaceRoot(root: string | null): void {
	workspaceRoot = root ? path.resolve(root) : null;
}

export function getWorkspaceRoot(): string | null {
	return workspaceRoot;
}

/** Resolve user-supplied path (absolute or relative to workspace) and ensure it stays inside workspace. */
export function resolveWorkspacePath(userPath: string): string {
	const root = workspaceRoot;
	if (!root) {
		throw new Error('No workspace folder open.');
	}
	const resolved = path.isAbsolute(userPath) ? path.resolve(userPath) : path.resolve(root, userPath);
	if (!isPathInsideRoot(resolved, root)) {
		throw new Error('Path escapes workspace.');
	}
	return resolved;
}

export function isPathInsideRoot(filePath: string, root: string): boolean {
	const a = path.normalize(filePath);
	const b = path.normalize(root);
	if (a === b) {
		return true;
	}
	const rel = path.relative(b, a);
	return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}
