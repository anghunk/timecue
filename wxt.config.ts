import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	manifest: ({ browser }) => ({
		name: '知时 · TimeCue',
		description: '到点提醒，确认才收起。支持定时、倒计时、固定日程与间隔提醒。',
		permissions: ['alarms', 'storage'],
		...(browser === 'firefox' ? {
			browser_specific_settings: {
				gecko: {
					id: 'timecue@extensions.local',
					data_collection_permissions: { required: ['none'] },
				},
			},
		} : {}),
	}),
	vite: () => ({ plugins: [tailwindcss()] }),
});
