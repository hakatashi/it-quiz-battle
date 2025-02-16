import {createSignal, onMount, type Component} from 'solid-js';
import {Quizzes, storage} from '~/lib/firebase';
import {useDownloadURL, useFirestore} from 'solid-firebase';
import {doc} from 'firebase/firestore';
import {ref} from 'firebase/storage';
import QuizStatement from '~/lib/QuizStatement';
import Doc from '~/lib/Doc';

import styles from './QuizScene.module.css';
import {setScene} from '~/stores';

const QuizScene: Component = () => {
	const quizIndex = 1013;
	const quizId = `it-${quizIndex.toString().padStart(6, '0')}`;
	const quiz = useFirestore(doc(Quizzes, quizId));
	const quizQuestionDataUrl = useDownloadURL(
		ref(storage, `quiz/${quizId}/question.mp3`),
	);

	const [ellapsedTime, setEllapsedTime] = createSignal(0);

	let audioElement!: HTMLAudioElement;

	const onAudioTimeUpdate = () => {
		const currentTime = audioElement.currentTime;
		setEllapsedTime(currentTime);
	};

	const onPushAnswerButton = () => {
		if (audioElement) {
			audioElement.pause();
		}
	};

	const onClickBackButton = () => {
		setScene('home');
	};

	onMount(() => {
		const interval = setInterval(() => {
			onAudioTimeUpdate();
		}, 30);

		audioElement.play();
		audioElement.addEventListener('timeupdate', onAudioTimeUpdate);
		audioElement.addEventListener('ended', onAudioTimeUpdate);
		audioElement.addEventListener('pause', onAudioTimeUpdate);

		return () => {
			clearInterval(interval);
			audioElement.removeEventListener('timeupdate', onAudioTimeUpdate);
			audioElement.removeEventListener('ended', onAudioTimeUpdate);
			audioElement.removeEventListener('pause', onAudioTimeUpdate);
		};
	});

	return (
		<div class={styles.quiz_scene}>
			<div class={styles.header_area}>
				<h1>ITクイズ</h1>
				<button
					class={styles.back_button}
					type="button"
					onClick={onClickBackButton}
				>
					退出
				</button>
				<audio controls={true} autoplay={true} hidden={true} ref={audioElement}>
					<source src={quizQuestionDataUrl()} type="audio/mpeg" />
					<track kind="captions" />
				</audio>
			</div>
			<div class={styles.question_area}>
				<Doc data={quiz}>
					{(data) => (
						<div>
							<QuizStatement
								clauses={data.clauses}
								ellapsedTime={ellapsedTime()}
								timepoints={data.timepoints}
							/>
						</div>
					)}
				</Doc>
			</div>
			<div class={styles.answer_area}>
				<button
					class={styles.answer_button}
					type="button"
					onClick={onPushAnswerButton}
				>
					回答
				</button>
			</div>
		</div>
	);
};

export default QuizScene;
