import type { ReminderInput, Timing } from './types';

export const MINUTE = 60_000;
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** 存储序列化可能调整对象键顺序，因此按规则语义比较是否真的改变。 */
export function sameTiming(left: Timing, right: Timing): boolean {
	if (left.type === 'once' && right.type === 'once') return left.at === right.at;
	if (left.type === 'countdown' && right.type === 'countdown') return left.minutes === right.minutes;
	if (left.type === 'interval' && right.type === 'interval') return left.minutes === right.minutes && left.rule === right.rule;
	if (left.type === 'schedule' && right.type === 'schedule') {
		return left.time === right.time && [...new Set(left.days)].sort().join(',') === [...new Set(right.days)].sort().join(',');
	}
	return false;
}

/** 按本地日历寻找严格晚于 after 的下一次触发时间，保留夏令时语义。 */
export function nextCalendarTime(timing: Extract<Timing, { type: 'schedule' }>, after: number): number {
	const [hours, minutes] = timing.time.split(':').map(Number);
	for (let offset = 0; offset <= 7; offset++) {
		const candidate = new Date(after);
		candidate.setDate(candidate.getDate() + offset);
		candidate.setHours(hours!, minutes!, 0, 0);
		if (timing.days.includes(candidate.getDay()) && candidate.getTime() > after) {
			return candidate.getTime();
		}
	}
	throw new Error('请至少选择一个提醒日。');
}

/** 计算新建或重新启用后的首次提醒时间。 */
export function firstDueAt(timing: Timing, now: number): number {
	switch (timing.type) {
		case 'once':
			if (timing.at <= now) throw new Error('指定时间已过去，请选择未来的时间。');
			return timing.at;
		case 'countdown':
		case 'interval':
			return now + timing.minutes * MINUTE;
		case 'schedule':
			return nextCalendarTime(timing, now);
	}
}

/** 确认后安排下一次；固定间隔跳过已错过的时刻，不累计补发。 */
export function nextAfterConfirmation(timing: Timing, plannedAt: number, now: number): number | null {
	if (timing.type === 'once' || timing.type === 'countdown') return null;
	if (timing.type === 'schedule') return nextCalendarTime(timing, now);
	const interval = timing.minutes * MINUTE;
	return timing.rule === 'after-confirmation'
		? now + interval
		: plannedAt + (Math.floor((now - plannedAt) / interval) + 1) * interval;
}

/** 验证来自界面的数据；后台保存前也调用，避免写入无效规则。 */
export function validateInput(input: ReminderInput): void {
	if (!input || typeof input.title !== 'string' || !input.title.trim()) throw new Error('请输入提醒标题。');
	if (input.title.trim().length > 80) throw new Error('标题最多 80 个字。');
	if (typeof input.note !== 'string' || input.note.length > 500) throw new Error('备注最多 500 个字。');
	if (input.url !== undefined) {
		if (typeof input.url !== 'string' || input.url.length > 2048) throw new Error('链接最多 2048 个字符。');
		if (input.url.trim()) {
			let url: URL;
			try { url = new URL(input.url.trim()); }
			catch { throw new Error('请输入完整的网址，例如 https://example.com。'); }
			if (!['http:', 'https:'].includes(url.protocol)) throw new Error('链接仅支持 HTTP 或 HTTPS 网址。');
		}
	}
	const timing = input.timing;
	if (!timing || !['once', 'countdown', 'schedule', 'interval'].includes(timing.type)) {
		throw new Error('请选择有效的提醒类型。');
	}
	if (timing.type === 'once' && (!Number.isFinite(timing.at) || Number.isNaN(new Date(timing.at).getTime()))) {
		throw new Error('请选择有效的日期时间。');
	}
	if (timing.type === 'countdown' || timing.type === 'interval') {
		if (!Number.isInteger(timing.minutes) || timing.minutes < 1 || timing.minutes > 525_600) {
			throw new Error('时长须为 1 至 525600 之间的整数分钟。');
		}
		if (timing.type === 'interval' && !['fixed', 'after-confirmation'].includes(timing.rule)) {
			throw new Error('请选择间隔计算规则。');
		}
	}
	if (timing.type === 'schedule') {
		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timing.time)) throw new Error('请选择有效的提醒时间。');
		if (!Array.isArray(timing.days) || timing.days.length === 0 || timing.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
			throw new Error('请至少选择一个有效的提醒日。');
		}
	}
}
