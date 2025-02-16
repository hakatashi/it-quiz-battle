import {Match, Switch, type Component} from 'solid-js';

import styles from './index.module.css';
import QuizScene from '~/lib/QuizScene';
import {scene, setScene} from '~/stores';
import {createGame} from '~/lib/firebase';

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
						<button
							class={styles.start_button}
							type="button"
							onClick={() => createGame()}
						>
							ゲームを作成
						</button>
					</div>
				</Match>
				<Match when={scene() === 'quiz'}>
					<QuizScene />
				</Match>
				<Match when={scene() === 'result'}>
					<div />
				</Match>
			</Switch>
		</div>
	);
};

export default Index;
