import { useCallback, useEffect, useState } from 'react';
import { execute } from './client';
import { watchState } from './store';
import type { AppState, Command, Preferences } from './types';

/** 从后台加载状态，并订阅其他标签页的修改；递增版本防止响应乱序。 */
export function useTimeCue() {
	const [state, setState] = useState<AppState | null>(null);
	const [error, setError] = useState('');
	const accept = useCallback((incoming: AppState) => {
		setState((current) => !current || incoming.revision >= current.revision ? incoming : current);
	}, []);
	const run = useCallback(async (command: Command) => {
		try {
			const result = await execute(command);
			accept(result);
			setError('');
			return result;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : '加载失败，请重试。');
			throw cause;
		}
	}, [accept]);
	useEffect(() => {
		let active = true;
		const unwatch = watchState((incoming) => { if (active) accept(incoming); });
		void execute({ type: 'timecue:state' }).then(
			(incoming) => { if (active) accept(incoming); },
			(cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '加载失败，请重试。'); },
		);
		return () => { active = false; unwatch(); };
	}, [accept]);
	return { state, error, run };
}

/** 根据系统外观解析主题；网页卡片仅在自身容器上应用返回值。 */
export function useTheme(preference: Preferences['theme'] = 'system') {
	const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
	useEffect(() => {
		const query = matchMedia('(prefers-color-scheme: dark)');
		const listener = () => setDark(query.matches);
		query.addEventListener('change', listener);
		return () => query.removeEventListener('change', listener);
	}, []);
	return preference === 'system' ? dark ? 'dark' : 'light' : preference;
}

/** 仅用于时间文案刷新，实际提醒触发由后台 alarms 处理。 */
export function useClock(active = true) {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		if (!active) return;
		setNow(Date.now());
		const interval = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(interval);
	}, [active]);
	return now;
}
