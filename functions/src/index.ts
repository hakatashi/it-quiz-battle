import {onCall} from 'firebase-functions/https';
import {initializeApp} from 'firebase-admin/app';
import {
	type CollectionReference,
	getFirestore,
	Timestamp,
} from 'firebase-admin/firestore';
import type {Quiz, Game, GameQuiz} from '../../src/lib/schema.ts';
import {sampleSize} from 'lodash-es';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
	process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
}

const app = initializeApp();
const db = getFirestore(app);

const Quizzes = db.collection('quizzes') as CollectionReference<Quiz>;
const Games = db.collection('games') as CollectionReference<Game>;

export const createGame = onCall(async () => {
	const now = Timestamp.now();

	const gameIndex = await db.runTransaction(async (transaction) => {
		const lastGame = await transaction.get(
			Games.orderBy('index', 'desc').limit(1),
		);
		const newGameIndex = lastGame.empty ? 0 : lastGame.docs[0].data().index + 1;

		const quizCandidates = await transaction.get(
			Quizzes.orderBy('lastUsedGame').limit(100),
		);
		if (quizCandidates.docs.length < 10) {
			throw new Error('Not enough quizzes');
		}

		const quizzes = sampleSize(quizCandidates.docs, 10).map((doc) => doc.ref);

		transaction.set(Games.doc(newGameIndex.toString()), {
			index: newGameIndex,
			createdAt: now,
		});

		const GameQuizzes = Games.doc(newGameIndex.toString()).collection(
			'quizzes',
		) as CollectionReference<GameQuiz>;

		for (const [index, quiz] of quizzes.entries()) {
			transaction.set(GameQuizzes.doc(quiz.id), {
				quiz,
				index,
				createdAt: now,
			});
			transaction.update(quiz, {
				lastUsedGame: newGameIndex,
			});
		}

		return newGameIndex;
	});

	return {gameIndex};
});
