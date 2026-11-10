import { useCallback, useEffect, useRef, useState } from 'react';
import { useClock, useTheme, useTimeCue } from '../lib/hooks';
import { formatUpcoming, TYPE_LABELS } from '../lib/format';
import type { Reminder } from '../lib/types';

/** 直接绘制卡片图标，避免内容脚本依赖图标库或外部 SVG 资源。 */
function CardIcon({ name, size, className }: {
	name: Reminder['timing']['type'] | 'check' | 'confirmed' | 'loading';
	size: number;
	className?: string;
}) {
	const shapes = {
		once: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
		countdown: <><path d="M9 2h6M12 2v3m6 1 2-2" /><circle cx="12" cy="14" r="8" /><path d="M12 9v5l2 2" /></>,
		schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-14 4h2m4 0h2m-8 4h2m4 0h2" /></>,
		interval: <><path d="m16 2 4 4-4 4M20 6H7a3 3 0 0 0-3 3m4 13-4-4 4-4m-4 4h13a3 3 0 0 0 3-3" /></>,
		check: <path d="m5 12 4 4L19 6" />,
		confirmed: <><path d="m2 12 4 4L16 6m-5 10 3 3L24 9" /></>,
		loading: <path d="M21 12a9 9 0 1 1-9-9" />,
	};
	return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>{shapes[name]}</svg>;
}

/** 保留退场中的卡片，等待动画完成后再移除 DOM。 */
interface VisibleCard {
	reminder: Reminder;
	exiting: boolean;
	confirmed: boolean;
}

/** 静音提醒卡片；确认成功后先显示反馈，再淡出并收拢占位。 */
export function ReminderCard({ reminder, now, busy, error, onConfirm, exiting = false, confirmed = false, onExited }: {
	reminder: Pick<Reminder, 'title' | 'note' | 'url' | 'pendingAt'> & { timing: Pick<Reminder['timing'], 'type'> };
	now: number;
	busy?: boolean;
	error?: string;
	onConfirm: () => void;
	preview?: boolean;
	exiting?: boolean;
	confirmed?: boolean;
	onExited?: () => void;
}) {
	const exitCallback = useRef(onExited);
	exitCallback.current = onExited;
	useEffect(() => {
		if (!exiting) return;
		// 减少动态效果时立即结束；定时兜底处理后台标签中未触发的动画事件。
		const timeout = setTimeout(() => exitCallback.current?.(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800);
		return () => clearTimeout(timeout);
	}, [exiting]);
	const elapsed = Math.max(0, Math.floor((now - (reminder.pendingAt ?? now)) / 60_000));
	return <div className={`reminder-card-slot ${exiting ? 'is-exiting' : ''}`} onAnimationEnd={(event) => {
		if (event.target === event.currentTarget && event.animationName === 'timecue-collapse') exitCallback.current?.();
	}}>
		<div className="reminder-card-clip">
			<article className={`reminder-card ${confirmed ? 'is-confirmed' : ''}`} data-type={reminder.timing.type} aria-busy={busy || undefined}>
				<div className="reminder-card-brand"><span className="reminder-card-kind"><span className="reminder-kind-icon"><CardIcon name={reminder.timing.type} size={15} /></span>{TYPE_LABELS[reminder.timing.type]}</span><div className="reminder-card-time"><span>{formatUpcoming(reminder.pendingAt ?? now, now)}</span>{elapsed > 0 && <span>已等待 {elapsed} 分钟</span>}</div></div>
				<h2>{reminder.title}</h2>
				{reminder.note && <p className="reminder-card-note">{reminder.note}</p>}
				{reminder.url && <a className="reminder-card-link" href={reminder.url} target="_blank" rel="noopener noreferrer">{reminder.url}</a>}
				<div className="reminder-card-footer"><button type="button" className="reminder-confirm" onClick={onConfirm} disabled={busy || exiting}>{confirmed ? <CardIcon name="confirmed" size={16} /> : busy ? <CardIcon name="loading" size={15} className="spin" /> : <CardIcon name="check" size={16} />}{confirmed ? '已收到' : busy ? '确认中…' : '确认收到'}</button></div>
				{error && !exiting && <p className="reminder-card-error" role="alert">{error}</p>}
			</article>
		</div>
	</div>;
}

/** 监听持久化状态，跨标签确认或删除时也保留完整的退场动画。 */
export function ReminderCards() {
	const { state, run, error } = useTimeCue();
	const theme = useTheme(state?.preferences.theme);
	const [busy, setBusy] = useState<string | null>(null);
	const confirming = useRef(false);
	const [failedPendingId, setFailedPendingId] = useState<string | null>(null);
	const [cards, setCards] = useState<VisibleCard[]>([]);
	const pending = state?.reminders.filter((reminder) => reminder.pendingId).sort((a, b) => a.pendingAt! - b.pendingAt!) ?? [];
	const now = useClock(cards.length > 0);
	const limit = state?.preferences.visibleCards ?? 3;

	useEffect(() => {
		if (!state) return;
		const visible = state.reminders.filter((reminder) => reminder.pendingId).sort((a, b) => a.pendingAt! - b.pendingAt!).slice(0, state.preferences.visibleCards);
		setCards((previous) => {
			const retained = previous.map((card) => {
				const current = visible.find((reminder) => reminder.pendingId === card.reminder.pendingId);
				if (current) return { reminder: current, exiting: false, confirmed: false };
				const confirmed = card.confirmed || state.history.some((entry) => entry.reminderId === card.reminder.id && entry.dueAt === card.reminder.pendingAt);
				return { ...card, exiting: true, confirmed };
			});
			return [...retained, ...visible.filter((reminder) => !previous.some((card) => card.reminder.pendingId === reminder.pendingId)).map((reminder) => ({ reminder, exiting: false, confirmed: false }))];
		});
	}, [state]);

	/** 只移除已退场的当前实例，不影响同一提醒的后续实例。 */
	const removeCard = useCallback((pendingId: string) => {
		setCards((current) => current.filter((card) => card.reminder.pendingId !== pendingId || !card.exiting));
	}, []);

	/** 后台确认成功才退场；失败时保持卡片，允许用户重试。 */
	async function confirm(reminder: Reminder) {
		if (confirming.current || !reminder.pendingId) return;
		confirming.current = true;
		setBusy(reminder.pendingId);
		setFailedPendingId(null);
		try { await run({ type: 'timecue:ack', id: reminder.id, pendingId: reminder.pendingId }); }
		catch { setFailedPendingId(reminder.pendingId); }
		finally { confirming.current = false; setBusy(null); }
	}

	if (!cards.length) return null;
	return <section className="timecue-stack" data-theme={theme} aria-label="知时待确认提醒" aria-live="polite">
		{cards.map(({ reminder, exiting, confirmed }) => <ReminderCard key={reminder.pendingId} reminder={reminder} now={now} busy={busy === reminder.pendingId} error={failedPendingId === reminder.pendingId ? error || undefined : undefined} exiting={exiting} confirmed={confirmed} onExited={() => removeCard(reminder.pendingId!)} onConfirm={() => { void confirm(reminder); }} />)}
		{pending.length > limit && <div className="reminder-overflow">还有 {pending.length - limit} 条待确认，确认后依次显示</div>}
	</section>;
}
