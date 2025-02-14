import {createSignal, onMount, type Component} from 'solid-js';
import {Quizzes, storage} from '~/lib/firebase';
import {useDownloadURL, useFirestore} from 'solid-firebase';
import {doc} from 'firebase/firestore';
import {ref} from 'firebase/storage';
import QuizStatement from '~/lib/QuizStatement';
import Doc from '~/lib/Doc';

const Index: Component = () => {
	const quiz = useFirestore(doc(Quizzes, 'it-000000'));
	const quizQuestionDataUrl = useDownloadURL(
		ref(storage, 'quiz/it-000000/question.mp3'),
	);

	const [ellapsedTime, setEllapsedTime] = createSignal(0);

	let audioElement!: HTMLAudioElement;

	onMount(() => {
		const interval = setInterval(() => {
			setEllapsedTime((prev) => prev + 0.1);
		}, 100);

		audioElement.play();

		return () => clearInterval(interval);
	});

	return (
		<div>
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
