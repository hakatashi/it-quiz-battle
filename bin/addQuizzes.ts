import {tokenize, type KuromojiToken} from 'kuromojin';
import {v1beta1 as GoogleCloudTextToSpeech} from '@google-cloud/text-to-speech';
import {protos} from '@google-cloud/text-to-speech';
import 'dotenv/config';
import type {Quiz} from '~/lib/schema';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, type CollectionReference} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {range} from 'lodash-es';
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Hard to refactor
export const formatQuizToSsml = async (text: string) => {
	const normalizedQuestion = text
		.replaceAll(
			/<ruby><rb>(.+?)<\/rb><rp>.+?<\/rp><rt>(.+?)<\/rt><rp>.+?<\/rp><\/ruby>/g,
			'<sub alias="$2">$1</sub>',
		)
		.replaceAll(
			/<em>(.+?)<\/em>/g,
			'<emphasis level="strong"><prosody pitch="+3st">$1</prosody></emphasis>',
		)
		.replaceAll(/\(.+?\)/g, '')
		.replaceAll(/（.+?）/g, '');

	const tokens = await tokenize(normalizedQuestion);

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

	const components: string[][] = [];
	let isPrevComponentEnd = false;
	for (const clause of clauses) {
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

	return {clauses, ssml};
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
