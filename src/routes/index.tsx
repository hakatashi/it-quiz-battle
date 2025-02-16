import {Match, Switch, type Component} from 'solid-js';

import styles from './index.module.css';
import QuizScene from '~/lib/QuizScene';
import {scene, setScene} from '~/stores';

const Index: Component = () => {
	return (
		<div class={styles.content}>
			<Switch>
				<Match when={scene() === 'home'}>
					<div class={styles.header_area}>
						<h1>ITクイズ</h1>
					</div>
					<div class={styles.question_area}>
						<p>ITクイズを開始しますか？</p>
						<button
							class={styles.start_button}
							type="button"
							onClick={() => setScene('quiz')}
						>
							開始
						</button>
					</div>
				</Match>
				<Match when={scene() === 'quiz'}>
					<QuizScene />
				</Match>
				<Match when={scene() === 'result'} />
			</Switch>
		</div>
	);
};

export default Index;
