import { useEffect, useState } from 'react';
import { ArrowUpRight, Bell, BellRing, CalendarDays, ChevronRight, Clock3, LoaderCircle, Repeat2, ShieldCheck, Timer } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { useClock, useTheme, useTimeCue } from '../../lib/hooks';
import { formatUpcoming, TYPE_LABELS } from '../../lib/format';
import { openOptions } from '../../lib/client';

const timingIcons = { once: Clock3, countdown: Timer, schedule: CalendarDays, interval: Repeat2 };

/** 用简短的相对时间辅助阅读，具体触发时间始终完整显示。 */
function formatRemaining(timestamp: number, now: number): string {
	const minutes = Math.ceil((timestamp - now) / 60_000);
	if (minutes <= 1) return '即将提醒';
	if (minutes < 60) return `${minutes} 分钟后`;
	if (minutes < 1440) return `约 ${Math.round(minutes / 60)} 小时后`;
	return `约 ${Math.round(minutes / 1440)} 天后`;
}

/** Popup 聚焦当前概况和下一次安排，完整操作仍在提醒管理页完成。 */
export function PopupApp() {
	const { state, error, run } = useTimeCue();
	const [openError, setOpenError] = useState('');
	const [retrying, setRetrying] = useState(false);
	const theme = useTheme(state?.preferences.theme);
	const now = useClock();
	useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
	const pending = state?.reminders.filter((reminder) => reminder.pendingId).sort((a, b) => a.pendingAt! - b.pendingAt!) ?? [];
	const enabled = state?.reminders.filter((reminder) => reminder.enabled).length ?? 0;
	const next = state?.reminders.filter((reminder) => reminder.enabled && reminder.nextDueAt !== null).sort((a, b) => a.nextDueAt! - b.nextDueAt!)[0];
	const NextIcon = next ? timingIcons[next.timing.type] : Clock3;
	const confirmedToday = state?.history.filter((entry) => new Date(entry.confirmedAt).toDateString() === new Date(now).toDateString()).length ?? 0;

	/** 由浏览器打开管理页；失败时保留面板与错误反馈。 */
	async function manage() {
		try { await openOptions(); window.close(); }
		catch { setOpenError('管理页未能打开，请重试。'); }
	}

	/** 连接失败后重新获取状态，避免面板一直显示加载中。 */
	async function retry() {
		if (retrying) return;
		setRetrying(true);
		try { await run({ type: 'timecue:state' }); }
		catch { /* 保留连接错误，允许再次重试。 */ }
		finally { setRetrying(false); }
	}

	return <div className="popup-app">
		<header className="popup-header">
			<Brand compact />
			<button type="button" className="popup-manage" aria-label="打开提醒管理" onClick={() => { void manage(); }}>管理<ArrowUpRight size={14} /></button>
		</header>
		{(error || openError) && <div className="popup-error" role="alert">{error || openError}</div>}
		{!state ? <div className="popup-loading" role="status">
			{error ? <><Bell size={24} strokeWidth={1.5} /><span>暂时无法加载提醒</span><button type="button" className="button" disabled={retrying} onClick={() => { void retry(); }}>{retrying && <LoaderCircle className="spin" size={14} />}{retrying ? '正在重试' : '重新加载'}</button></> : <><LoaderCircle className="spin" size={20} /><span>正在加载提醒…</span></>}
		</div> : <div className="popup-content">
			<section className="popup-stats" aria-label="提醒概览">
				<div className="popup-stat"><span>已启用</span><strong>{enabled}</strong></div>
				<div className={`popup-stat ${pending.length ? 'has-pending' : ''}`}><span>待确认</span><strong>{pending.length}</strong></div>
				<div className="popup-stat"><span>今日确认</span><strong>{confirmedToday}</strong></div>
			</section>
			<div className="popup-agenda">
				{pending.length > 0 && <button type="button" className="popup-pending" onClick={() => { void manage(); }}>
					<span className="popup-pending-heading"><BellRing size={14} /><strong>{pending.length} 条待确认</strong><ChevronRight size={14} /></span>
					<span className="popup-pending-titles">{pending.slice(0, 2).map((reminder) => reminder.title).join('、')}{pending.length > 2 ? '…' : ''}</span>
				</button>}
				<section className="popup-upcoming" aria-labelledby="popup-upcoming-title">
					<div className="popup-section-heading"><h2 id="popup-upcoming-title">下一次提醒</h2>{next && <span>{formatRemaining(next.nextDueAt!, now)}</span>}</div>
					{next ? <article className="popup-next" data-type={next.timing.type}>
						<span className="popup-kind-icon"><NextIcon size={16} /></span>
						<div className="popup-next-content">
							<h3>{next.title}</h3>
							<div className="popup-next-meta"><time dateTime={new Date(next.nextDueAt!).toISOString()}>{formatUpcoming(next.nextDueAt!, now)}</time><span aria-hidden="true">·</span><span>{TYPE_LABELS[next.timing.type]}</span></div>
							{next.note && <p title={next.note}>{next.note}</p>}
						</div>
					</article> : <div className="popup-empty">
						<span className="popup-kind-icon"><Clock3 size={18} strokeWidth={1.5} /></span>
						<div><h3>暂无新的安排</h3><p>{pending.length ? '已有提醒会保留，直到你确认收到。' : '在管理页添加或调整你的提醒。'}</p></div>
					</div>}
				</section>
			</div>
		</div>}
		<footer className="popup-footer">
			<p className="popup-privacy"><ShieldCheck size={13} />数据仅保存在本机</p>
		</footer>
	</div>;
}
