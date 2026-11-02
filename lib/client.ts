import { browser } from 'wxt/browser';
import type { AppState, Command, CommandResult } from './types';

/** 通过后台执行操作，保持所有页面的写入顺序一致。 */
export async function execute(command: Command): Promise<AppState> {
	const result: CommandResult | undefined = await browser.runtime.sendMessage(command);
	if (!result) throw new Error('暂时无法连接知时，请刷新页面后重试。');
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

/** 打开扩展的完整管理页。 */
export async function openOptions(): Promise<void> {
	await browser.runtime.openOptionsPage();
}
