import {createSignal, onMount, type Component} from 'solid-js';
import {Quizzes, storage} from '~/lib/firebase';
import {useDownloadURL, useFirestore} from 'solid-firebase';
import {doc} from 'firebase/firestore';
import {ref} from 'firebase/storage';
import QuizStatement from '~/lib/QuizStatement';
import Doc from '~/lib/Doc';

import styles from './index.module.css';

const Index: Component = () => {
	const quizIndex = 1000 + Math.floor(Math.random() * 30);
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
		<div class={styles.content}>
			<h1>ITクイズ</h1>
			<audio controls={true} ref={audioElement}>
				<source src={quizQuestionDataUrl()} type="audio/mpeg" />
				<track kind="captions" />
			</audio>
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
	);
};

export default Index;
