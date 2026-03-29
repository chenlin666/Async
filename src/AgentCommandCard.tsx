type Props = { lang: string; body: string };

function IconTerminal({ className }: { className?: string }) {
	return (
		<svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<path d="M7 10l3 2-3 2M13 14h4" strokeLinecap="round" />
		</svg>
	);
}

/** 短命令块（npm run / 验证构建等），参考 Cursor 侧栏命令行条目 */
export function AgentCommandCard({ lang, body }: Props) {
	return (
		<div className="ref-agent-command-card" role="note" aria-label="命令">
			<span className="ref-agent-command-ico" aria-hidden>
				<IconTerminal className="ref-agent-command-ico-svg" />
			</span>
			<div className="ref-agent-command-body">
				<span className="ref-agent-command-lang">{lang}</span>
				<pre className="ref-agent-command-pre">{body}</pre>
			</div>
		</div>
	);
}
