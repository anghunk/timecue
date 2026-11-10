import { createRoot } from 'react-dom/client';
import { ReminderCards } from '../../components/ReminderCards';
import cardsCss from '../../styles/cards.css?inline';

export default defineContentScript({
	matches: ['http://*/*', 'https://*/*'],
	runAt: 'document_idle',
	async main(ctx) {
		const ui = await createShadowRootUi(ctx, {
			name: 'timecue-reminders',
			// 样式随脚本打包，避免 WXT 请求 content-scripts/reminder.css。
			css: cardsCss.replaceAll(':root', ':host'),
			position: 'overlay',
			zIndex: 2147483647,
			anchor: 'body',
			onMount(container) {
				const wrapper = document.createElement('div');
				container.append(wrapper);
				const root = createRoot(wrapper);
				root.render(<ReminderCards />);
				return root;
			},
			onRemove(root) { root?.unmount(); },
		});
		ui.mount();
		ctx.onInvalidated(() => ui.remove());
	},
});
