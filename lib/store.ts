import { storage } from 'wxt/utils/storage';
import type { AppState } from './types';
import { emptyState } from './types';

export const STATE_KEY = 'local:timecue-state' as const;

/** 读取持久化状态；只有后台负责修改此存储项。 */
export async function readState(): Promise<AppState> {
	return (await storage.getItem<AppState>(STATE_KEY)) ?? emptyState();
}

/** 监听跨标签状态变化；返回用于页面卸载时的清理函数。 */
export function watchState(callback: (state: AppState) => void): () => void {
	return storage.watch<AppState>(STATE_KEY, (value) => callback(value ?? emptyState()));
}

/** 为每次写入分配递增版本，界面据此避免旧响应覆盖新状态。 */
export async function writeState(state: AppState): Promise<AppState> {
	const next = { ...state, revision: state.revision + 1 };
	await storage.setItem(STATE_KEY, next);
	return next;
}
