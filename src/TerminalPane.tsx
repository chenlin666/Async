import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function Terminal() {
	const containerRef = useRef<HTMLDivElement>(null);
	const termRef = useRef<XTerm | null>(null);
	const fitRef = useRef<FitAddon | null>(null);
	const [line, setLine] = useState('');

	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const term = new XTerm({
			theme: {
				background: '#0c0c0e',
				foreground: '#e4e4e7',
				cursor: '#6366f1',
			},
			fontSize: 12,
			fontFamily: 'Consolas, "Courier New", monospace',
		});
		const fit = new FitAddon();
		term.loadAddon(fit);
		term.open(el);
		fit.fit();
		term.writeln('\x1b[90mAsync · 行级执行（工作区目录下 shell 命令）\x1b[0m');
		termRef.current = term;
		fitRef.current = fit;

		const ro = new ResizeObserver(() => fit.fit());
		ro.observe(el);
		return () => {
			ro.disconnect();
			term.dispose();
			termRef.current = null;
		};
	}, []);

	const runLine = async () => {
		const term = termRef.current;
		const shell = window.asyncShell;
		if (!term || !shell || !line.trim()) {
			return;
		}
		const cmd = line.trim();
		term.writeln(`\x1b[36m$ ${cmd}\x1b[0m`);
		setLine('');
		try {
			const r = (await shell.invoke('terminal:execLine', cmd)) as {
				ok: boolean;
				stdout?: string;
				stderr?: string;
				error?: string;
			};
			if (r.ok) {
				if (r.stdout) {
					term.write(r.stdout.replace(/\n/g, '\r\n'));
				}
				if (r.stderr) {
					term.writeln(`\x1b[31m${r.stderr}\x1b[0m`);
				}
			} else {
				term.writeln(`\x1b[31m${r.error ?? 'failed'}\x1b[0m`);
				if (r.stdout) {
					term.write(r.stdout.replace(/\n/g, '\r\n'));
				}
				if (r.stderr) {
					term.writeln(`\x1b[33m${r.stderr}\x1b[0m`);
				}
			}
		} catch (e) {
			term.writeln(`\x1b[31m${String(e)}\x1b[0m`);
		}
		term.writeln('');
	};

	return (
		<div className="terminal-panel">
			<div className="panel-title">终端</div>
			<div ref={containerRef} className="xterm-viewport" />
			<div className="terminal-input-row">
				<input
					className="terminal-line-input"
					placeholder="输入命令并回车…"
					value={line}
					onChange={(e) => setLine(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							void runLine();
						}
					}}
				/>
			</div>
		</div>
	);
}
