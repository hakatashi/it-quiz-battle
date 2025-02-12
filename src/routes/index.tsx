import type {Component} from 'solid-js';
import {Quizzes} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import {doc} from 'firebase/firestore';
import QuizStatement from '~/lib/QuizStatement';
import Doc from '~/lib/Doc';

const Index: Component = () => {
	const quiz = useFirestore(doc(Quizzes, 'it-000000'));

	return (
		<div>
			<Doc data={quiz}>
				{(data) => (
					<div>
						<QuizStatement
							clauses={data.clauses}
							ellapsedTime={3.5}
							timepoints={data.timepoints}
						/>
					</div>
				)}
			</Doc>
		</div>
	);
};

export default Index;
