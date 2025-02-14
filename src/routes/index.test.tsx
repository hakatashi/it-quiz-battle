import {test, expect} from 'vitest';
import {render} from '@solidjs/testing-library';
import Index from './index.js';

test('has add task button', async () => {
	const {getByRole} = render(() => <Index />);
	const heading1 = getByRole('heading', {level: 1});
	expect(heading1).toHaveTextContent('ITクイズ');
});
