import styles from './QuizStatement.module.css';
import type {Timepoint} from './schema.ts';

interface QuizStatementProps {
	clauses: string[];
	ellapsedTime: number;
	timepoints: Timepoint[];
}

const QuizStatement = (props: QuizStatementProps) => {
	return (
		<div class={styles.quiz}>
			{props.clauses.map((token) => (
				<span class={styles.quiz_token}>{token}</span>
			))}
		</div>
	);
};

export default QuizStatement;
