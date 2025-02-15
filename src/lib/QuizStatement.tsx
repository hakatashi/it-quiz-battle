import {createMemo, Show} from 'solid-js';
import styles from './QuizStatement.module.css';
import type {Timepoint} from './schema.ts';
import DomPurify from 'dompurify';

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
	html: string;
	duration: number;
	hiddenRatio: number;
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
			const timeSeconds = timepoint.timeSeconds ?? 0;
			const clause = props.clauses
				.slice(previousMarkIndex + 1, markIndex + 1)
				.join('')
				.replaceAll(' ', '\xa0');

			const duration = timeSeconds - offset;
			let hiddenRatio = 1;
			if (props.ellapsedTime > timeSeconds) {
				hiddenRatio = 0;
			} else if (props.ellapsedTime < offset) {
				hiddenRatio = 1;
			} else {
				hiddenRatio = 1 - (props.ellapsedTime - offset) / duration;
			}

			const clauseHtml = DomPurify.sanitize(clause, {
				// biome-ignore lint/style/useNamingConvention: External
				ALLOWED_TAGS: ['ruby', 'rb', 'rt', 'rp', 'em'],
			});

			outputs.push({
				html: clauseHtml,
				duration,
				hiddenRatio,
			});

			offset = timeSeconds;
			previousMarkIndex = markIndex;
		}

		return outputs;
	});

	return (
		<div class={styles.quiz}>
			{clauseInformation().map((clauseInfo, clauseIndex) => (
				<Show when={clauseInfo.hiddenRatio < 1}>
					<Show when={clauseIndex !== 0}>
						<wbr />
					</Show>
					<span
						class={styles.quiz_clause}
						style={{
							'--hidden-ratio': clauseInfo.hiddenRatio,
						}}
						innerHTML={clauseInfo.html}
					/>
				</Show>
			))}
		</div>
	);
};

export default QuizStatement;
