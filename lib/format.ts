import type { Timing } from './types';

export const TYPE_LABELS = { once: '指定时间', countdown: '倒计时', schedule: '固定日程', interval: '间隔重复' };

/** 将分钟数转换为适合提醒说明的时长。 */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	return hours ? `${hours} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟`;
}

/** 保留本地时区，使用完整日期展示确认记录和提示信息。 */
export function formatDateTime(timestamp: number): string {
	return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp);
}

/** 同日时间显示“今天”，其他日期保留月日。 */
export function formatUpcoming(timestamp: number, now = Date.now()): string {
	const date = new Date(timestamp);
	const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
	return date.toDateString() === new Date(now).toDateString() ? `今天 ${time}` : formatDateTime(timestamp);
}

/** 生成规则摘要，让列表与编辑页保持一致。 */
export function formatTiming(timing: Timing): string {
	if (timing.type === 'once') return formatDateTime(timing.at);
	if (timing.type === 'countdown') return `${formatDuration(timing.minutes)}后`;
	if (timing.type === 'interval') return `每 ${formatDuration(timing.minutes)} · ${timing.rule === 'fixed' ? '固定间隔' : '确认后计时'}`;
	const days = [...new Set(timing.days)].sort().join(',');
	const label = days === '0,1,2,3,4,5,6' ? '每天' : days === '1,2,3,4,5' ? '工作日' : `每周${[1, 2, 3, 4, 5, 6, 0].filter((day) => timing.days.includes(day)).map((day) => '日一二三四五六'[day]).join('、')}`;
	return `${label} ${timing.time}`;
}

/** datetime-local 需要本地年月日，不能直接使用 UTC 的 ISO 字符串。 */
export function toLocalInput(timestamp: number): string {
	const date = new Date(timestamp);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
