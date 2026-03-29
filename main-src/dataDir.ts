import * as fs from 'node:fs';
import * as path from 'node:path';

const DIR = 'async';
const LEGACY = 'void-shell';

/** 应用数据目录；若仅有旧版 void-shell 目录则一次性复制到 async，避免丢设置与线程。 */
export function resolveAsyncDataDir(userData: string): string {
	const dir = path.join(userData, DIR);
	const legacy = path.join(userData, LEGACY);
	if (!fs.existsSync(dir) && fs.existsSync(legacy)) {
		try {
			fs.cpSync(legacy, dir, { recursive: true });
		} catch {
			/* 复制失败时仍使用新目录 */
		}
	}
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}
