/** 四种提醒规则；固定日程的星期值与 Date.getDay() 一致。 */
export type Timing =
	| { type: 'once'; at: number }
	| { type: 'countdown'; minutes: number }
	| { type: 'schedule'; time: string; days: number[] }
	| { type: 'interval'; minutes: number; rule: 'fixed' | 'after-confirmation' };

/** 一条提醒最多保留一个待确认实例，pendingId 用于拒绝过期确认。 */
export interface Reminder {
	id: string;
	title: string;
	note: string;
	url?: string;
	timing: Timing;
	enabled: boolean;
	nextDueAt: number | null;
	pendingAt: number | null;
	pendingId: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface Confirmation {
	id: string;
	reminderId: string;
	title: string;
	dueAt: number;
	confirmedAt: number;
}

export interface Preferences {
	theme: 'system' | 'light' | 'dark';
	visibleCards: 1 | 3 | 5;
}

export interface AppState {
	version: 1;
	revision: number;
	reminders: Reminder[];
	history: Confirmation[];
	preferences: Preferences;
}

export interface ReminderInput {
	id?: string;
	title: string;
	note: string;
	url?: string;
	timing: Timing;
}

export type Command =
	| { type: 'timecue:state' }
	| { type: 'timecue:save'; input: ReminderInput }
	| { type: 'timecue:toggle'; id: string; enabled: boolean }
	| { type: 'timecue:delete'; id: string }
	| { type: 'timecue:ack'; id: string; pendingId: string }
	| { type: 'timecue:preferences'; preferences: Preferences }
	| { type: 'timecue:clear-history' };

export type CommandResult = { ok: true; state: AppState } | { ok: false; error: string };

/** 创建独立的初始状态，避免调用方意外共享可变数组。 */
export function emptyState(): AppState {
	return {
		version: 1,
		revision: 0,
		reminders: [],
		history: [],
		preferences: { theme: 'system', visibleCards: 3 },
	};
}
