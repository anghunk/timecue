import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCheck, Clock3, LoaderCircle, Repeat2, Timer } from 'lucide-react';
import { useClock, useTheme, useTimeCue } from '../lib/hooks';
import { formatUpcoming, TYPE_LABELS } from '../lib/format';
import type { Reminder } from '../lib/types';

const timingIcons = { once: Clock3, countdown: Timer, schedule: CalendarDays, interval: Repeat2 };

/** 保留退场中的卡片，等待动画完成后再移除 DOM。 */
interface VisibleCard {
	reminder: Reminder;
	exiting: boolean;
	confirmed: boolean;
}

/** 静音提醒卡片；确认成功后先显示反馈，再淡出并收拢占位。 */
export function ReminderCard({ reminder, now, busy, error, onConfirm, preview = false, exiting = false, confirmed = false, onExited }: {
	reminder: Pick<Reminder, 'title' | 'note' | 'pendingAt'> & { timing: Pick<Reminder['timing'], 'type'> };
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
	const Icon = timingIcons[reminder.timing.type];
	return <div className={`reminder-card-slot ${exiting ? 'is-exiting' : ''}`} onAnimationEnd={(event) => {
		if (event.target === event.currentTarget && event.animationName === 'timecue-collapse') exitCallback.current?.();
	}}>
		<div className="reminder-card-clip">
			<article className={`reminder-card ${confirmed ? 'is-confirmed' : ''}`} data-type={reminder.timing.type} aria-busy={busy || undefined}>
				<div className="reminder-card-brand"><span className="reminder-card-kind"><span className="reminder-kind-icon"><Icon size={15} /></span>{TYPE_LABELS[reminder.timing.type]}</span><span className="reminder-card-status">{confirmed ? <><Check size={11} />已收到</> : preview ? '预览' : '待确认'}</span></div>
				<h2>{reminder.title}</h2>
				{reminder.note && <p className="reminder-card-note">{reminder.note}</p>}
				<div className="reminder-card-footer"><div className="reminder-card-time"><span>{formatUpcoming(reminder.pendingAt ?? now, now)}</span><span>{elapsed ? `已等待 ${elapsed} 分钟` : '到时间了'}</span></div><button type="button" className="reminder-confirm" onClick={onConfirm} disabled={busy || exiting}>{confirmed ? <CheckCheck size={16} /> : busy ? <LoaderCircle size={15} className="spin" /> : <Check size={16} />}{confirmed ? '已收到' : busy ? '确认中…' : '确认收到'}</button></div>
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
