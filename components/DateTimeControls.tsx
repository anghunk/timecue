import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { CalendarDate, getLocalTimeZone, Time, today } from '@internationalized/date';
import {
	Button, Calendar, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader,
	CalendarHeaderCell, DateInput, DatePicker, DateSegment, Dialog, DialogTrigger,
	FieldError, Group, Heading, Label, ListBox, ListBoxItem, Popover, TimeField,
} from 'react-aria-components';

interface CalendarControlProps {
	label: string;
	value: CalendarDate | null;
	onChange: (value: CalendarDate | null) => void;
	disabled?: boolean;
}

/** 中文日期输入与日历共用一个值，支持键盘分段输入、翻月及快捷选日。 */
export function CalendarControl({ label, value, onChange, disabled }: CalendarControlProps) {
	const [open, setOpen] = useState(false);
	const current = today(getLocalTimeZone());
	return <DatePicker className="temporal-field" value={value} onChange={onChange} isDisabled={disabled} isRequired isOpen={open} onOpenChange={setOpen}>
		<Label className="control-label">{label}</Label>
		<Group className="temporal-input">
			<DateInput className="date-segments">{(segment) => <DateSegment segment={segment} className="date-segment" />}</DateInput>
			<Button className="field-trigger" aria-label="打开日期日历"><CalendarDays size={16} /></Button>
		</Group>
		<FieldError className="control-error" />
		<Popover className="control-popover calendar-popover" placement="bottom start" offset={6}>
			<Dialog className="control-dialog" aria-label="选择提醒日期">
				<Calendar className="calendar">
					<header className="calendar-header"><Button slot="previous" className="icon-button" aria-label="上个月"><ChevronLeft size={16} /></Button><Heading /><Button slot="next" className="icon-button" aria-label="下个月"><ChevronRight size={16} /></Button></header>
					<CalendarGrid weekdayStyle="narrow" className="calendar-grid">
						<CalendarGridHeader>{(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}</CalendarGridHeader>
						<CalendarGridBody>{(date) => <CalendarCell date={date} className="calendar-day" />}</CalendarGridBody>
					</CalendarGrid>
				</Calendar>
				<div className="calendar-shortcuts">{[{ label: '今天', date: current }, { label: '明天', date: current.add({ days: 1 }) }, { label: '一周后', date: current.add({ weeks: 1 }) }].map((item) => <Button key={item.label} className="date-shortcut" onPress={() => { onChange(item.date); setOpen(false); }}>{item.label}</Button>)}</div>
			</Dialog>
		</Popover>
	</DatePicker>;
}

interface TimeControlProps {
	label: string;
	value: Time | null;
	onChange: (value: Time | null) => void;
	disabled?: boolean;
}

/** 24 小时制分段输入，配合可滚动的小时、分钟列表，避免依赖系统时间弹窗。 */
export function TimeControl({ label, value, onChange, disabled }: TimeControlProps) {
	const [open, setOpen] = useState(false);
	const columns = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const frame = requestAnimationFrame(() => {
			columns.current?.querySelectorAll('[data-selected]').forEach((item) => item.scrollIntoView({ block: 'nearest' }));
		});
		return () => cancelAnimationFrame(frame);
	}, [open, value?.hour, value?.minute]);
	return <TimeField className="temporal-field" value={value} onChange={onChange} hourCycle={24} granularity="minute" shouldForceLeadingZeros isRequired isDisabled={disabled}>
		<Label className="control-label">{label}</Label>
		<div className="temporal-input">
			<DateInput className="date-segments">{(segment) => <DateSegment segment={segment} className="date-segment" />}</DateInput>
			<DialogTrigger isOpen={open} onOpenChange={setOpen}>
				<Button className="field-trigger" aria-label={`选择${label}`} isDisabled={disabled}><Clock3 size={16} /></Button>
				<Popover className="control-popover time-popover" placement="bottom end" offset={6}>
					<Dialog className="control-dialog" aria-label={`选择${label}`}>
						<div className="time-columns" ref={columns}>
							{(['hour', 'minute'] as const).map((part) => <div key={part} className="time-column"><span>{part === 'hour' ? '小时' : '分钟'}</span><ListBox className="time-list" aria-label={part === 'hour' ? '小时' : '分钟'} selectionMode="single" disallowEmptySelection selectedKeys={value ? [value[part]] : []} onSelectionChange={(keys) => {
								if (keys === 'all') return;
								const selected = Number([...keys][0]);
								if (!Number.isInteger(selected)) return;
								onChange(new Time(part === 'hour' ? selected : value?.hour ?? 0, part === 'minute' ? selected : value?.minute ?? 0));
							}}>{Array.from({ length: part === 'hour' ? 24 : 60 }, (_, index) => <ListBoxItem key={index} id={index} textValue={String(index).padStart(2, '0')} className="time-option">{String(index).padStart(2, '0')}</ListBoxItem>)}</ListBox></div>)}
						</div>
						<div className="time-footer"><Button className="date-shortcut" onPress={() => { const now = new Date(); onChange(new Time(now.getHours(), now.getMinutes())); }}>现在</Button><Button className="button primary small" onPress={() => setOpen(false)}>完成</Button></div>
					</Dialog>
				</Popover>
			</DialogTrigger>
		</div>
		<FieldError className="control-error" />
	</TimeField>;
}
