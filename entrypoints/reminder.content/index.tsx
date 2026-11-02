import { createRoot } from 'react-dom/client';
import { ReminderCards } from '../../components/ReminderCards';
import '../../styles/cards.css';

export default defineContentScript({
	matches: ['http://*/*', 'https://*/*'],
	cssInjectionMode: 'ui',
	runAt: 'document_idle',
	async main(ctx) {
		const ui = await createShadowRootUi(ctx, {
			name: 'timecue-reminders',
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
