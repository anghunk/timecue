/** 管理页与弹出面板共用的应用图标和名称。 */
export function Brand({ compact = false }: { compact?: boolean }) {
	return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
		<div className="brand-mark" aria-hidden="true"><img src="/icon/128.png" alt="" width={36} height={36} draggable={false} /></div>
		<div><strong>知时<span className="brand-dot"> · </span><span className="brand-en">TimeCue</span></strong></div>
	</div>;
}
