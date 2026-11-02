import { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, CheckCheck, Clock3, History, Info, LoaderCircle, Monitor, Moon, Pencil, Plus, Repeat2, Search, Settings2, ShieldCheck, Sun, Timer, Trash2 } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { ReminderEditor } from '../../components/ReminderEditor';
import { ReminderCard } from '../../components/ReminderCards';
import { SelectControl } from '../../components/SelectControl';
import { useClock, useTheme, useTimeCue } from '../../lib/hooks';
import { formatDateTime, formatTiming, formatUpcoming, TYPE_LABELS } from '../../lib/format';
import type { Command, Reminder, Timing } from '../../lib/types';

const timingIcons = { once: Clock3, countdown: Timer, schedule: CalendarDays, interval: Repeat2 };
type Section = 'reminders' | 'history' | 'settings';
const sections = [
	{ id: 'reminders', label: '提醒管理', icon: Bell },
	{ id: 'history', label: '确认记录', icon: History },
	{ id: 'settings', label: '通用设置', icon: Settings2 },
] as const;
const filters = [{ id: 'all', label: '全部' }, { id: 'pending', label: '待确认' }, { id: 'active', label: '已启用' }, { id: 'paused', label: '未启用' }] as const;

/** 完整管理页承载所有编辑与设置，Popup 只提供概要与入口。 */
export function OptionsApp() {
	const { state, error, run } = useTimeCue();
	const theme = useTheme(state?.preferences.theme);
	const now = useClock();
	const [section, setSection] = useState<Section>('reminders');
	const [filter, setFilter] = useState<typeof filters[number]['id']>('all');
	const [query, setQuery] = useState('');
	const [editor, setEditor] = useState<Reminder | 'new' | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [settingsBusy, setSettingsBusy] = useState(false);
	const [previewPhase, setPreviewPhase] = useState<'visible' | 'exiting' | 'hidden'>('visible');
	const [previewType, setPreviewType] = useState<Timing['type']>('schedule');
	useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
	const pending = state?.reminders.filter((reminder) => reminder.pendingId) ?? [];
	const enabled = state?.reminders.filter((reminder) => reminder.enabled) ?? [];
	const upcoming = enabled.filter((reminder) => reminder.nextDueAt !== null).sort((a, b) => a.nextDueAt! - b.nextDueAt!);
	const visible = (state?.reminders ?? []).filter((reminder) => {
		const match = `${reminder.title} ${reminder.note}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());
		return match && (filter === 'all' || filter === 'pending' && reminder.pendingId || filter === 'active' && reminder.enabled || filter === 'paused' && !reminder.enabled);
	}).sort((a, b) => Number(Boolean(b.pendingId)) - Number(Boolean(a.pendingId)) || Number(b.enabled) - Number(a.enabled) || (a.nextDueAt ?? Infinity) - (b.nextDueAt ?? Infinity) || b.createdAt - a.createdAt);

	/** 对同一提醒的操作串行提交，并把后台错误留在页面上。 */
	async function perform(command: Command, id: string) {
		if (busy) return;
		setBusy(id);
		try { await run(command); } catch { /* 页面统一显示错误。 */ }
		finally { setBusy(null); }
	}

	/** 可逆偏好即时保存，同时锁定控件，避免快速点击写入旧设置。 */
	async function changePreferences(preferences: NonNullable<typeof state>['preferences']) {
		if (settingsBusy) return;
		setSettingsBusy(true);
		try { await run({ type: 'timecue:preferences', preferences }); } catch { /* 页面统一显示错误。 */ }
		finally { setSettingsBusy(false); }
	}

	return <div className="workspace">
		<div className="app-shell">
			<aside className="sidebar">
				<Brand />
				<nav aria-label="管理导航">{sections.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${section === id ? 'selected' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon size={16} /><span>{label}</span>{id === 'reminders' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}</nav>
				<div className="sidebar-bottom"><div className="quiet-note"><ShieldCheck size={12} />数据仅保存在本机</div><div className="sidebar-meta"><span>TimeCue</span><span>v0.1.0</span></div></div>
			</aside>
			<main className="main-panel">
				<div className="main-content">
					{error && <div className="error-banner" role="alert">{error}<button type="button" onClick={() => { void run({ type: 'timecue:state' }).catch(() => {}); }}>重试</button></div>}
					{!state ? <div className="loading-state" role="status"><LoaderCircle size={22} className="spin" /><span>正在加载提醒…</span></div> : <>
						{section === 'reminders' && <>
							<header className="page-header"><div><h1>提醒管理</h1><p>管理定时、倒计时和重复提醒。</p></div><button className="button primary" onClick={() => setEditor('new')}><Plus size={15} />新建提醒</button></header>
							<div className="overview-strip">
								<button className="overview-item" onClick={() => setFilter('active')}><span className="overview-icon blue"><Bell size={17} /></span><span><small>已启用提醒</small><strong>{enabled.length}<em>条</em></strong></span></button>
								<button className="overview-item" onClick={() => setFilter('pending')}><span className="overview-icon amber"><Clock3 size={17} /></span><span><small>等待你的确认</small><strong>{pending.length}<em>条</em></strong></span></button>
								<div className="overview-item next-overview"><span className="overview-icon neutral"><CalendarDays size={17} /></span><span><small>下一次提醒</small><strong className="next-time">{upcoming[0] ? formatUpcoming(upcoming[0].nextDueAt!, now) : '暂无安排'}</strong>{upcoming[0] && <span className="next-title">{upcoming[0].title}</span>}</span></div>
							</div>
							<div className="list-toolbar"><div className="segmented" aria-label="筛选提醒">{filters.map((item) => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}{item.id === 'pending' && pending.length > 0 && <span>{pending.length}</span>}</button>)}</div><span className="list-count">{visible.length} 条提醒</span><label className="search-field"><Search size={14} /><input type="search" placeholder="搜索提醒" aria-label="搜索提醒" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
							{visible.length ? <div className="reminder-list">{visible.map((reminder) => {
								const Icon = timingIcons[reminder.timing.type];
								return <article className={`reminder-row ${reminder.pendingId ? 'is-pending' : ''} ${!reminder.enabled && !reminder.pendingId ? 'is-paused' : ''}`} key={reminder.id}>
									<div className="row-icon" data-type={reminder.timing.type}><Icon size={17} /></div>
									<div className="reminder-row-content">
										<div className="reminder-row-title"><h2>{reminder.title}</h2>{reminder.pendingId && <span className="badge amber">待确认</span>}{!reminder.enabled && <span className="badge neutral">{reminder.timing.type === 'once' || reminder.timing.type === 'countdown' ? state.history.some((entry) => entry.reminderId === reminder.id) ? '已完成' : '未启用' : '已暂停'}</span>}</div>
										{reminder.note && <p className="row-note" title={reminder.note}>{reminder.note}</p>}
										<div className="row-rule"><span className="row-type" data-type={reminder.timing.type}>{TYPE_LABELS[reminder.timing.type]}</span><span>{formatTiming(reminder.timing)}</span></div>
									</div>
									<div className="reminder-row-side">
										<div className={`row-next ${reminder.pendingId ? 'pending-text' : ''}`}>{reminder.pendingId ? <><span>已到时间{!reminder.enabled ? ' · 后续已暂停' : ''}</span><strong>{formatUpcoming(reminder.pendingAt!, now)}</strong></> : reminder.enabled && reminder.nextDueAt ? <><span>下一次提醒</span><strong>{formatUpcoming(reminder.nextDueAt, now)}</strong></> : <span>启用后开始安排</span>}</div>
										<div className="row-actions">{reminder.pendingId && <button className="button small confirm-inline" disabled={Boolean(busy)} onClick={() => { void perform({ type: 'timecue:ack', id: reminder.id, pendingId: reminder.pendingId! }, reminder.id); }}><Check size={13} />确认</button>}<button role="switch" aria-checked={reminder.enabled} aria-label={`${reminder.enabled ? '暂停' : '启用'}提醒：${reminder.title}`} title={reminder.enabled ? '暂停提醒' : '启用提醒'} className="switch" disabled={Boolean(busy)} onClick={() => { void perform({ type: 'timecue:toggle', id: reminder.id, enabled: !reminder.enabled }, reminder.id); }}><span /></button><span className="action-divider" /><button className="icon-button" aria-label={`编辑：${reminder.title}`} title="编辑提醒" disabled={Boolean(busy)} onClick={() => setEditor(reminder)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`删除：${reminder.title}`} title="删除提醒" disabled={Boolean(busy)} onClick={() => { if (window.confirm(`删除“${reminder.title}”？${reminder.pendingId ? '正在显示的提醒卡片也会移除。' : ''}`)) void perform({ type: 'timecue:delete', id: reminder.id }, reminder.id); }}><Trash2 size={15} /></button></div>
									</div>
								</article>;
							})}</div> : <div className="empty-state"><div className="empty-art"><Clock3 size={38} strokeWidth={1.2} /><span className="empty-spark one" /><span className="empty-spark two" /></div><h2>{state.reminders.length ? '这里还没有匹配的提醒' : '给下一件小事，留个提醒'}</h2><p>{state.reminders.length ? '试试其他关键词，或切换筛选条件。' : '一杯水、一次休息、一场约定，知时会帮你记得。'}</p>{!state.reminders.length && <button className="button" onClick={() => setEditor('new')}><Plus size={14} />创建第一条提醒</button>}</div>}
							<div className="subtle-footnote"><Info size={13} /><span>到期后，卡片会留在支持的网页右上角，直到你点击“确认收到”。</span></div>
						</>}
						{section === 'history' && <>
							<header className="page-header"><div><h1>确认记录</h1><p>查看已确认的提醒，保留最近 200 条。</p></div>{state.history.length > 0 && <button className="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('清空全部确认记录？提醒配置会保留。')) void perform({ type: 'timecue:clear-history' }, 'history'); }}><Trash2 size={14} />清空记录</button>}</header>
							{state.history.length ? <div className="history-list">{state.history.map((entry) => <article className="history-row" key={entry.id}><div className="history-check"><CheckCheck size={18} /></div><div><h2>{entry.title}</h2><p>原定 {formatDateTime(entry.dueAt)}</p></div><span className="history-time">{formatDateTime(entry.confirmedAt)}<small>已确认</small></span></article>)}</div> : <div className="empty-state"><div className="empty-art"><CheckCheck size={36} strokeWidth={1.3} /></div><h2>还没有确认记录</h2><p>点击提醒卡片的“确认收到”后，会在这里记录。</p></div>}
						</>}
						{section === 'settings' && <>
							<header className="page-header"><div><h1>通用设置</h1><p>调整界面外观和提醒卡片的显示方式。</p></div><span className="autosave-label"><Check size={12} />{settingsBusy ? '正在保存' : '自动保存'}</span></header>
							<div className="settings-section"><h2 className="section-title">外观</h2><div className="settings-group"><div className="settings-row"><div><h3>界面主题</h3><p>管理页、Popup 与提醒卡片保持一致。</p></div><div className="segmented theme-picker">{([{ id: 'light', label: '浅色', icon: Sun }, { id: 'dark', label: '深色', icon: Moon }, { id: 'system', label: '系统', icon: Monitor }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={state.preferences.theme === id} className={state.preferences.theme === id ? 'selected' : ''} disabled={settingsBusy} onClick={() => { void changePreferences({ ...state.preferences, theme: id }); }}><Icon size={13} />{label}</button>)}</div></div><div className="settings-row"><div><h3>同时显示卡片数</h3><p>其余提醒在确认前面的卡片后依次显示。</p></div><SelectControl label="同时显示卡片数" hideLabel value={String(state.preferences.visibleCards)} disabled={settingsBusy} options={[{ id: '1', label: '1 张' }, { id: '3', label: '3 张' }, { id: '5', label: '5 张' }]} onChange={(value) => { void changePreferences({ ...state.preferences, visibleCards: Number(value) as 1 | 3 | 5 }); }} /></div></div></div>
							<div className="settings-section"><h2 className="section-title">卡片预览</h2><div className="preview-surface"><div className="preview-toolbar"><span className="preview-caption">提醒会在网页右上角出现</span><div className="segmented preview-types" aria-label="预览提醒类型">{(Object.keys(TYPE_LABELS) as Timing['type'][]).map((type) => <button key={type} aria-pressed={previewType === type} className={previewType === type ? 'selected' : ''} onClick={() => { setPreviewType(type); setPreviewPhase('visible'); }}>{TYPE_LABELS[type]}</button>)}</div></div><div className="preview-card-wrap">{previewPhase !== 'hidden' ? <ReminderCard key={previewType} reminder={{ title: '站起来，给自己一点空隙', note: '伸个懒腰，看看远处。片刻之后，再回来继续。', pendingAt: now, timing: { type: previewType } }} now={now} preview exiting={previewPhase === 'exiting'} confirmed={previewPhase === 'exiting'} onConfirm={() => setPreviewPhase('exiting')} onExited={() => setPreviewPhase('hidden')} /> : <div className="preview-done"><CheckCheck size={24} /><span>已收到，安心继续手边的事。</span><button className="button" onClick={() => setPreviewPhase('visible')}>重新预览</button></div>}</div><div className="preview-label">外观示意 · 实际提醒需点击确认才会收起</div></div></div>
							<div className="settings-section"><h2 className="section-title">关于知时</h2><div className="settings-group"><div className="settings-row"><div><h3>到点提醒，确认才收起。</h3><p>知时 · TimeCue 0.1.0</p></div><span className="badge blue">静音卡片</span></div><div className="settings-row"><div><h3>数据保存在本机浏览器</h3><p>提醒、偏好与确认记录均在当前浏览器内保存。</p></div><ShieldCheck size={18} className="muted" /></div></div><p className="settings-note">需要允许知时在对应网站上运行。浏览器设置页、扩展商店等受保护页面不展示卡片。正常使用浏览器时提醒，浏览器关闭期间不运行。</p></div>
						</>}
					</>}
				</div>
			</main>
		</div>
		{editor && <ReminderEditor reminder={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSave={(input) => run({ type: 'timecue:save', input })} />}
	</div>;
}
