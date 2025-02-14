import {createMemo, Show} from 'solid-js';
import styles from './QuizStatement.module.css';
import type {Timepoint} from './schema.ts';
import {clamp} from 'lodash-es';

interface QuizStatementProps {
	clauses: string[];
	ellapsedTime: number;
	timepoints: Timepoint[];
}

const extractMarkIndex = (markName: string | null | undefined) =>
	markName === null || markName === undefined
		? Number.NaN
		: Number.parseInt(markName.match(/c(\d+)/)?.[1] ?? '');

interface ClauseInformation {
	text: string;
	duration: number;
	ellapsedTime: number;
}

const QuizStatement = (props: QuizStatementProps) => {
	const sortedTimepoints = createMemo(() =>
		props.timepoints.sort(
			(a, b) => extractMarkIndex(a.markName) - extractMarkIndex(b.markName),
		),
	);

	const clauseInformation = createMemo(() => {
		const outputs: ClauseInformation[] = [];
		let previousMarkIndex = -1;
		let offset = 0;

		for (const timepoint of sortedTimepoints()) {
			const markIndex = extractMarkIndex(timepoint.markName);
			const clause = props.clauses
				.slice(previousMarkIndex + 1, markIndex + 1)
				.join('')
				.replaceAll(' ', '\xa0');

			const duration = (timepoint.timeSeconds ?? 0) - offset;

			outputs.push({
				text: clause,
				duration,
				ellapsedTime: clamp(props.ellapsedTime - offset, 0, duration),
			});

			offset = timepoint.timeSeconds ?? 0;
			previousMarkIndex = markIndex;
		}

		return outputs;
	});

	return (
		<div class={styles.quiz}>
			{clauseInformation().map((clauseInfo, clauseIndex) => (
				<Show when={clauseInfo.ellapsedTime > 0}>
					<Show when={clauseIndex !== 0}>
						<wbr />
					</Show>
					<span
						class={styles.quiz_clause}
						style={{
							'--hidden-ratio':
								1 - clauseInfo.ellapsedTime / clauseInfo.duration,
						}}
					>
						{clauseInfo.text}
					</span>
				</Show>
			))}
		</div>
	);
};

export default QuizStatement;
