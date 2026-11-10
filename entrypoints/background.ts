import { browser } from 'wxt/browser';
import { firstDueAt, nextAfterConfirmation, sameTiming, validateInput } from '../lib/schedule';
import { readState, writeState } from '../lib/store';
import type { AppState, Command, Reminder } from '../lib/types';

const NEXT_ALARM = 'timecue:next';
const WATCHDOG = 'timecue:watchdog';

/** 单写入队列避免同时确认、编辑与闹钟事件互相覆盖。 */
export default defineBackground(() => {
	let queue: Promise<unknown> = Promise.resolve();
	const enqueue = <T,>(work: () => Promise<T>): Promise<T> => {
		const task = queue.then(work);
		queue = task.catch((error) => console.error('[TimeCue]', error));
		return task;
	};

	/** 同步工具栏角标与最近一次待触发闹钟，无需逐条建立闹钟。 */
	async function syncRuntime(state: AppState): Promise<void> {
		const action = browser.action ?? browser.browserAction;
		const count = state.reminders.filter((reminder) => reminder.pendingId).length;
		await action.setBadgeText({ text: count ? String(count) : '' });
		await action.setBadgeBackgroundColor({ color: '#3b6cf6' });
		const upcoming = state.reminders.flatMap((reminder) => reminder.enabled && reminder.nextDueAt !== null && !reminder.pendingId ? [reminder.nextDueAt] : []);
		if (upcoming.length) await browser.alarms.create(NEXT_ALARM, { when: Math.max(Date.now() + 100, Math.min(...upcoming)) });
		else await browser.alarms.clear(NEXT_ALARM);
	}

	/** 把已到期提醒转换为一个持久化的待确认实例。 */
	async function reconcile(): Promise<AppState> {
		let state = await readState();
		const now = Date.now();
		let changed = false;
		state.reminders = state.reminders.map((reminder) => {
			if (!reminder.enabled || reminder.pendingId || reminder.nextDueAt === null || reminder.nextDueAt > now) return reminder;
			changed = true;
			return { ...reminder, pendingAt: reminder.nextDueAt, pendingId: crypto.randomUUID(), nextDueAt: null };
		});
		if (changed) state = await writeState(state);
		await syncRuntime(state);
		return state;
	}

	/** 校验并执行一个界面命令，确认实例 ID 不匹配时保持当前状态。 */
	async function handle(command: Command): Promise<AppState> {
		let state = await reconcile();
		const now = Date.now();
		if (command.type === 'timecue:state') return state;
		if (command.type === 'timecue:save') {
			const { input } = command;
			validateInput(input);
			const existing = input.id ? state.reminders.find((reminder) => reminder.id === input.id) : undefined;
			if (input.id && !existing) throw new Error('这条提醒已被删除，请刷新后重试。');
			const changedTiming = !existing || !sameTiming(existing.timing, input.timing);
			const enabled = existing?.enabled ?? true;
			const reminder: Reminder = {
				id: existing?.id ?? crypto.randomUUID(),
				title: input.title.trim(),
				note: input.note.trim(),
				url: input.url?.trim() ?? '',
				timing: input.timing,
				enabled,
				nextDueAt: existing?.pendingId || !enabled ? null : changedTiming ? firstDueAt(input.timing, now) : existing!.nextDueAt,
				pendingAt: existing?.pendingAt ?? null,
				pendingId: existing?.pendingId ?? null,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			};
			state.reminders = existing ? state.reminders.map((item) => item.id === existing.id ? reminder : item) : [...state.reminders, reminder];
		} else if (command.type === 'timecue:preferences') {
			if (!command.preferences || !['system', 'light', 'dark'].includes(command.preferences.theme) || ![1, 3, 5].includes(command.preferences.visibleCards)) throw new Error('无效的显示设置。');
			state.preferences = { theme: command.preferences.theme, visibleCards: command.preferences.visibleCards };
		} else if (command.type === 'timecue:clear-history') {
			state.history = [];
		} else {
			const reminder = state.reminders.find((item) => item.id === command.id);
			if (!reminder) throw new Error('这条提醒已被删除。');
			if (command.type === 'timecue:delete') {
				state.reminders = state.reminders.filter((item) => item.id !== command.id);
			} else if (command.type === 'timecue:toggle') {
				if (typeof command.enabled !== 'boolean') throw new Error('无效的启用状态。');
				if (reminder.enabled === command.enabled) return state;
				reminder.enabled = command.enabled;
				reminder.nextDueAt = command.enabled && !reminder.pendingId ? firstDueAt(reminder.timing, now) : null;
				reminder.updatedAt = now;
			} else if (command.type === 'timecue:ack') {
				if (!reminder.pendingId || command.pendingId !== reminder.pendingId) return state;
				state.history = [{ id: crypto.randomUUID(), reminderId: reminder.id, title: reminder.title, dueAt: reminder.pendingAt!, confirmedAt: now }, ...state.history].slice(0, 200);
				reminder.nextDueAt = reminder.enabled ? nextAfterConfirmation(reminder.timing, reminder.pendingAt!, now) : null;
				reminder.pendingAt = null;
				reminder.pendingId = null;
				if (reminder.timing.type === 'once' || reminder.timing.type === 'countdown') reminder.enabled = false;
				reminder.updatedAt = now;
			}
		}
		state = await writeState(state);
		await syncRuntime(state);
		return state;
	}

	const commands = new Set(['timecue:state', 'timecue:save', 'timecue:toggle', 'timecue:delete', 'timecue:ack', 'timecue:preferences', 'timecue:clear-history']);
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (sender.id !== browser.runtime.id || !message || !commands.has(message.type)) return;
		const fromExtensionPage = sender.url?.startsWith(browser.runtime.getURL('/'));
		if (!fromExtensionPage && message.type !== 'timecue:state' && message.type !== 'timecue:ack') return;
		void enqueue(() => handle(message as Command)).then(
			(state) => sendResponse({ ok: true, state }),
			(error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '操作失败，请重试。' }),
		);
		return true;
	});
	browser.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === NEXT_ALARM || alarm.name === WATCHDOG) void enqueue(reconcile);
	});
	/** 启动与后台重建时补齐调度；待确认状态始终从本地存储恢复。 */
	async function initialize(): Promise<void> {
		await browser.alarms.create(WATCHDOG, { periodInMinutes: 1 });
		await reconcile();
	}
	browser.runtime.onStartup.addListener(() => { void enqueue(initialize); });
	browser.runtime.onInstalled.addListener(() => { void enqueue(initialize); });
	void enqueue(initialize);
});
