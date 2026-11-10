import { useState, type FormEvent } from 'react';
import { CalendarDays, Clock3, LoaderCircle, Repeat2, Timer, X } from 'lucide-react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { getLocalTimeZone, parseDate, parseTime, toCalendarDateTime, type CalendarDate, type Time } from '@internationalized/date';
import type { Reminder, ReminderInput, Timing } from '../lib/types';
import { EVERY_DAY, validateInput, WEEKDAYS } from '../lib/schedule';
import { toLocalInput, TYPE_LABELS } from '../lib/format';
import { CalendarControl, TimeControl } from './DateTimeControls';
import { SelectControl } from './SelectControl';

const icons = { once: Clock3, countdown: Timer, schedule: CalendarDays, interval: Repeat2 };

/** 创建与编辑共用的提交表单；只显示当前提醒类型需要的规则。 */
export function ReminderEditor({ reminder, onClose, onSave }: {
	reminder?: Reminder;
	onClose: () => void;
	onSave: (input: ReminderInput) => Promise<unknown>;
}) {
	const original = reminder?.timing;
	const [type, setType] = useState<Timing['type']>(original?.type ?? 'once');
	const [title, setTitle] = useState(reminder?.title ?? '');
	const [note, setNote] = useState(reminder?.note ?? '');
	const [url, setUrl] = useState(reminder?.url ?? '');
	const initialDateTime = toLocalInput(original?.type === 'once' ? original.at : Date.now() + 3_600_000);
	const [date, setDate] = useState<CalendarDate | null>(() => parseDate(initialDateTime.split('T')[0]!));
	const [onceTime, setOnceTime] = useState<Time | null>(() => parseTime(initialDateTime.split('T')[1]!));
	const [minutes, setMinutes] = useState(original?.type === 'countdown' || original?.type === 'interval' ? String(original.minutes) : '30');
	const [time, setTime] = useState<Time | null>(() => parseTime(original?.type === 'schedule' ? original.time : '09:00'));
	const [days, setDays] = useState(original?.type === 'schedule' ? original.days : EVERY_DAY);
	const [rule, setRule] = useState<'fixed' | 'after-confirmation'>(original?.type === 'interval' ? original.rule : 'after-confirmation');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const dayPattern = [...days].sort().join(',') === EVERY_DAY.join(',') ? 'daily' : [...days].sort().join(',') === WEEKDAYS.join(',') ? 'weekdays' : 'custom';

	/** 后台再次校验；编辑倒计时的标题不会重置其原有触发时间。 */
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setError('');
		try {
			if (type === 'once' && (!date || !onceTime)) throw new Error('请完整填写提醒日期和时间。');
			if (type === 'schedule' && !time) throw new Error('请完整填写当天时间。');
			const timing: Timing = type === 'once' ? { type, at: toCalendarDateTime(date!, onceTime!).toDate(getLocalTimeZone()).getTime() }
				: type === 'schedule' ? { type, time: time!.toString().slice(0, 5), days: [...days].sort() }
				: type === 'interval' ? { type, minutes: Number(minutes), rule }
				: { type, minutes: Number(minutes) };
			const input = { id: reminder?.id, title, note, url: url.trim(), timing };
			validateInput(input);
			setSaving(true);
			await onSave(input);
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : '保存失败，请重试。');
		} finally { setSaving(false); }
	}

	return <ModalOverlay className="editor-overlay" isOpen isDismissable={!saving} isKeyboardDismissDisabled={saving} onOpenChange={(open) => { if (!open && !saving) onClose(); }}><Modal className="editor-dialog"><Dialog aria-labelledby="editor-title" className="editor-content">
		<form onSubmit={submit}>
			<div className="dialog-header"><h2 id="editor-title">{reminder ? '编辑提醒' : '新建提醒'}</h2><button type="button" className="icon-button" aria-label="关闭编辑" onClick={onClose} disabled={saving}><X size={18} /></button></div>
			<div className="dialog-body">
				{error && <div className="error-banner" role="alert">{error}</div>}
				<label className="field"><span>提醒标题 <span className="required">*</span></span><input autoFocus required maxLength={80} placeholder="例如：站起来活动一下" value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} /></label>
				<fieldset className="field"><legend>提醒类型</legend><div className="type-options">{(Object.keys(TYPE_LABELS) as Timing['type'][]).map((value) => { const Icon = icons[value]; return <button key={value} type="button" aria-pressed={type === value} className={`type-option ${type === value ? 'selected' : ''}`} onClick={() => { setType(value); setError(''); }} disabled={saving}><Icon size={19} /><span>{TYPE_LABELS[value]}</span></button>; })}</div></fieldset>
				<div className="rule-panel">
					{type === 'once' && <><div className="date-time-fields"><CalendarControl label="日期" value={date} onChange={setDate} disabled={saving} /><TimeControl label="时间" value={onceTime} onChange={setOnceTime} disabled={saving} /></div><p className="field-note">按浏览器所在的本地时区提醒。</p></>}
					{(type === 'countdown' || type === 'interval') && <label className="field"><span>{type === 'countdown' ? '多久后提醒' : '提醒间隔'}</span><div className="duration-input"><input type="number" required min={1} max={525600} step={1} value={minutes} onChange={(event) => setMinutes(event.target.value)} disabled={saving} /><span>分钟</span></div><div className="quick-durations">{[15, 30, 60, 120].map((value) => <button type="button" key={value} aria-pressed={Number(minutes) === value} className={Number(minutes) === value ? 'active' : ''} onClick={() => setMinutes(String(value))} disabled={saving}>{value < 60 ? `${value} 分钟` : `${value / 60} 小时`}</button>)}</div><small>{reminder ? '修改时长或重新启用时，会重新开始计时。' : '保存后开始计时，首次提醒等待一个完整间隔。'}</small></label>}
					{type === 'schedule' && <>
						<div className="field"><SelectControl label="重复日期" value={dayPattern} options={[{ id: 'daily', label: '每天' }, { id: 'weekdays', label: '工作日 · 周一至周五' }, { id: 'custom', label: '每周自选' }]} onChange={(value) => setDays(value === 'daily' ? EVERY_DAY : value === 'weekdays' ? WEEKDAYS : [1])} disabled={saving} /></div>
						<div className="weekday-options" aria-label="提醒星期">{[1, 2, 3, 4, 5, 6, 0].map((day) => <button key={day} type="button" className={days.includes(day) ? 'selected' : ''} aria-pressed={days.includes(day)} aria-label={`星期${'日一二三四五六'[day]}`} onClick={() => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])} disabled={saving}>{'日一二三四五六'[day]}</button>)}</div>
						<TimeControl label="当天时间" value={time} onChange={setTime} disabled={saving} /><p className="field-note">工作日按周一至周五计算，不包含法定调休判断。</p>
					</>}
					{type === 'interval' && <fieldset className="field"><legend>下一次从什么时候开始算</legend><div className="radio-options">{(['fixed', 'after-confirmation'] as const).map((value) => <label className={`radio-option ${rule === value ? 'selected' : ''}`} key={value}><input type="radio" name="interval-rule" value={value} checked={rule === value} onChange={() => setRule(value)} disabled={saving} /><span><strong>{value === 'fixed' ? '固定间隔' : '确认后重新计时'}</strong><small>{value === 'fixed' ? '保持首次提醒的时间节奏，错过的次数不堆积。' : '点击“确认收到”后，再等待一个完整间隔。'}</small></span></label>)}</div></fieldset>}
				</div>
				<label className="field"><span>备注 <span className="optional">可选</span></span><textarea rows={2} maxLength={500} placeholder="添加一点说明，会一起显示在提醒卡片中" value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} /></label>
				<label className="field"><span>链接 <span className="optional">可选</span></span><input type="url" maxLength={2048} placeholder="https://example.com" value={url} onChange={(event) => setUrl(event.target.value)} disabled={saving} /><small>提醒卡片中可点击网址，在新标签页打开。</small></label>
				{reminder?.pendingId && <p className="field-note">这条提醒正在等待确认。修改后仍保留卡片，新规则在确认后生效。</p>}
			</div>
			<div className="dialog-footer"><span>仅卡片提示 · 静音</span><div><button type="button" className="button" onClick={onClose} disabled={saving}>取消</button><button className="button primary" type="submit" disabled={saving}>{saving && <LoaderCircle className="spin" size={15} />}{saving ? '保存中' : reminder ? '保存更改' : '创建提醒'}</button></div></div>
		</form>
	</Dialog></Modal></ModalOverlay>;
}
