import {beforeEach, vi} from 'vitest';

const originalFetch = global.fetch;
const fetchMock = vi.fn<typeof fetch>((...args) => {
	const [url] = args;
	if (url === '/__/firebase/init.json') {
		return Promise.resolve(
			new Response(
				JSON.stringify({
					apiKey: 'fakeApiKey',
					projectId: 'it-quiz-battle',
					storageBucket: 'it-quiz-battle.firebasestorage.app',
				}),
			),
		);
	}
	return originalFetch(...args);
});
vi.stubGlobal('fetch', fetchMock);

beforeEach(async () => {
	// Reset firestore data
	await originalFetch(
		'http://localhost:8080/emulator/v1/projects/it-quiz-battle/databases/(default)/documents',
		{
			method: 'DELETE',
		},
	);
});
