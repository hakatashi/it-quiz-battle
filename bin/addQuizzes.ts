import {tokenize, type KuromojiToken} from 'kuromojin';
import {v1beta1 as GoogleCloudTextToSpeech} from '@google-cloud/text-to-speech';
import {protos} from '@google-cloud/text-to-speech';
import 'dotenv/config';
import type {Quiz} from '~/lib/schema';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, type CollectionReference} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {escapeRegExp, range} from 'lodash-es';
import {fileURLToPath} from 'node:url';

const logger = console;

const app = initializeApp({
	projectId: 'it-quiz-battle',
	storageBucket: 'it-quiz-battle.firebasestorage.app',
});
const db = getFirestore(app);
const Quizzes = db.collection('quizzes') as CollectionReference<Quiz>;

const storage = getStorage(app);

const textToSpeechClient = new GoogleCloudTextToSpeech.TextToSpeechClient();

const IT_QUIZ_URL =
	'https://github.com/hakatashi/it-quiz/releases/download/1.7.0/it-quiz-v1.7.0.json';

const getSpeech = async (ssml: string, voiceType: string) => {
	const speed = 0.9;

	const [response] = await textToSpeechClient.synthesizeSpeech({
		input: {
			ssml,
		},
		voice: {
			languageCode: 'ja-JP',
			name: voiceType,
		},
		audioConfig: {
			audioEncoding: 'MP3',
			speakingRate: speed,
			effectsProfileId: ['headphone-class-device'],
		},
		enableTimePointing: [
			protos.google.cloud.texttospeech.v1beta1.SynthesizeSpeechRequest
				.TimepointType.SSML_MARK,
		],
	});
	const data = Buffer.from(response.audioContent as string, 'binary');

	return {
		data,
		timepoints: response.timepoints,
	};
};

const isFuzokugo = (token: KuromojiToken) =>
	token.pos === '助詞' ||
	token.pos === '助動詞' ||
	token.pos_detail_1 === '接尾' ||
	token.pos_detail_1 === '非自立';

const CLAUSE_COMPONENTS_END_REGEX = /[、。?？]$/;

const increment = <T>(map: Map<T, number>, key: T, by = 1) => {
	const newValue = (map.get(key) ?? 0) + by;
	map.set(key, newValue);
	return newValue;
};

const isMapEqual = <K, V>(map1: Map<K, V>, map2: Map<K, V>) => {
	if (map1.size !== map2.size) {
		return false;
	}
	for (const [key, value] of map1) {
		if (map2.get(key) !== value) {
			return false;
		}
	}
	return true;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Hard to refactor
export const formatQuizToSsml = async (text: string) => {
	const rubyBaseTexts = new Set<string>(
		Array.from(text.matchAll(/<rb>(.+?)<\/rb>/g)).map((match) => match[1]),
	);
	const rubyBaseTextOccurences = new Map<string, number>(
		Array.from(rubyBaseTexts).map((baseText) => [baseText, 0]),
	);
	const rubyBaseTextIndexes = new Map<string, Map<number, string>>(
		Array.from(rubyBaseTexts).map((baseText) => [baseText, new Map()]),
	);

	const textSplitByRubies = text.split(/(<ruby>.+?<\/ruby>)/g);
	let textWithoutRuby = '';
	for (const part of textSplitByRubies) {
		if (part.startsWith('<ruby>')) {
			const baseText = part.match(/<rb>(.+?)<\/rb>/)?.[1];
			const rubyText = part.match(/<rt>(.+?)<\/rt>/)?.[1];
			if (baseText === undefined || rubyText === undefined) {
				throw new Error('Base text or ruby text is undefined');
			}
			const newIndex = increment(rubyBaseTextOccurences, baseText);
			rubyBaseTextIndexes.get(baseText)?.set(newIndex - 1, rubyText);

			for (const rubyBaseText of rubyBaseTexts) {
				if (baseText === rubyBaseText) {
					continue;
				}
				const matches = Array.from(
					baseText.matchAll(new RegExp(escapeRegExp(rubyBaseText), 'g')),
				);
				increment(rubyBaseTextOccurences, rubyBaseText, matches.length);
			}

			textWithoutRuby += baseText;
		} else {
			for (const rubyBaseText of rubyBaseTexts) {
				const matches = Array.from(
					part.matchAll(new RegExp(escapeRegExp(rubyBaseText), 'g')),
				);
				increment(rubyBaseTextOccurences, rubyBaseText, matches.length);
			}
			textWithoutRuby += part;
		}
	}

	const tokens = await tokenize(textWithoutRuby);

	const clauses: string[] = [];
	for (const [index, token] of tokens.entries()) {
		let prevPos: string | null = null;
		let prevForm: string | null = null;
		if (index !== 0) {
			prevPos = tokens[index - 1].pos;
			prevForm = tokens[index - 1].surface_form;
		}
		if (
			clauses.length === 0 ||
			token.pos === '記号' ||
			prevPos === '記号' ||
			token.surface_form === '、' ||
			prevForm === '、'
		) {
			clauses.push(token.surface_form);
		} else if (prevPos === '名詞' && token.pos === '名詞') {
			clauses[clauses.length - 1] += token.surface_form;
		} else if (isFuzokugo(token)) {
			clauses[clauses.length - 1] += token.surface_form;
		} else {
			clauses.push(token.surface_form);
		}
	}

	const rubyBaseTextOccurencesInSsmlClauses = new Map<string, number>(
		Array.from(rubyBaseTexts).map((baseText) => [baseText, 0]),
	);
	const ssmlClauses: string[] = [];

	for (const clause of clauses) {
		let ssmlClause = clause;
		for (const rubyBaseText of rubyBaseTexts) {
			ssmlClause = ssmlClause.replace(
				new RegExp(escapeRegExp(rubyBaseText), 'g'),
				(match) => {
					const index = increment(
						rubyBaseTextOccurencesInSsmlClauses,
						rubyBaseText,
					);
					const rubyText = rubyBaseTextIndexes
						.get(rubyBaseText)
						?.get(index - 1);
					if (rubyText !== undefined) {
						return `<sub alias="${rubyText}">${match}</sub>`;
					}
					return match;
				},
			);
		}
		ssmlClauses.push(ssmlClause);
	}

	if (
		!isMapEqual(rubyBaseTextOccurences, rubyBaseTextOccurencesInSsmlClauses)
	) {
		throw new Error('Ruby text occurences mismatch while converting to SSML');
	}

	const rubyBaseTextOccurencesInHtmlClauses = new Map<string, number>(
		Array.from(rubyBaseTexts).map((baseText) => [baseText, 0]),
	);
	const htmlClauses: string[] = [];

	for (const clause of clauses) {
		let htmlClause = clause;
		for (const rubyBaseText of rubyBaseTexts) {
			htmlClause = htmlClause.replace(
				new RegExp(escapeRegExp(rubyBaseText), 'g'),
				(match) => {
					const index = increment(
						rubyBaseTextOccurencesInHtmlClauses,
						rubyBaseText,
					);
					const rubyText = rubyBaseTextIndexes
						.get(rubyBaseText)
						?.get(index - 1);
					if (rubyText !== undefined) {
						return `<ruby><rb>${match}</rb><rp>（</rp><rt>${rubyText}</rt><rp>）</rp></ruby>`;
					}
					return match;
				},
			);
		}
		htmlClauses.push(htmlClause);
	}

	if (
		!isMapEqual(rubyBaseTextOccurences, rubyBaseTextOccurencesInHtmlClauses)
	) {
		throw new Error('Ruby text occurences mismatch while converting to HTML');
	}

	const components: string[][] = [];
	let isPrevComponentEnd = false;
	for (const clause of ssmlClauses) {
		if (components.length === 0 || isPrevComponentEnd) {
			components.push([clause]);
		} else {
			components[components.length - 1].push(clause);
		}
		isPrevComponentEnd = Boolean(clause.match(CLAUSE_COMPONENTS_END_REGEX));
	}

	let spannedQuestionText = '';
	let offset = 0;

	for (const component of components) {
		const spannedText = component
			.map((clause, index) => `${clause}<mark name="c${offset + index}"/>`)
			.join('');
		offset += component.length;
		spannedQuestionText += spannedText;
	}

	const ssml = `<speak>${spannedQuestionText}</speak>`;

	return {clauses: htmlClauses, ssml};
};

const fetchQuiz = async () => {
	const response = await fetch(IT_QUIZ_URL);
	const data = await response.json();

	for (const quizIndex of range(1000, 1030)) {
		const quizId = `it-${quizIndex.toString().padStart(6, '0')}`;

		const quizDoc = await Quizzes.doc(quizId).get();
		if (quizDoc.exists) {
			logger.log(`Quiz ${quizIndex} already exists`);
			continue;
		}

		logger.log(`Processing quiz ${quizIndex}`);

		const quiz = data[quizIndex];

		const {clauses, ssml} = await formatQuizToSsml(quiz.question);

		const {data: audioData, timepoints} = await getSpeech(
			ssml,
			'ja-JP-Neural2-D',
		);

		if (timepoints === undefined || timepoints === null) {
			throw new Error('timepoints is undefined or null');
		}

		await storage.bucket().file(`quiz/${quizId}/question.mp3`).save(audioData);

		await Quizzes.doc(quizId).set({
			type: 'it',
			index: quizIndex,
			question: quiz.question,
			answer: quiz.answer,
			alternativeAnswers: quiz.alternativeAnswers ?? [],
			description: quiz.description ?? null,
			clauses,
			timepoints,
			ssml,
		});
	}
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
	fetchQuiz();
}
