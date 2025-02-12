import {onRequest} from 'firebase-functions/https';
import {initializeApp} from 'firebase-admin/app';
import {type CollectionReference, getFirestore} from 'firebase-admin/firestore';
import {defineString} from 'firebase-functions/params';
import type {Quiz} from '../../src/lib/schema.ts';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
	process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
}

const app = initializeApp();
const db = getFirestore(app);

const Quizzes = db.collection('quizzes') as CollectionReference<Quiz>;

const apiKey = defineString('API_KEY');

export const getTasks = onRequest(async (request, response) => {
	if (request.query.apiKey !== apiKey.value()) {
		response.status(403).send('Unauthorized');
		return;
	}

	const quizzes = await Quizzes.get();
	const quizList = quizzes.docs.map((doc) => doc.data() as Quiz);
	response.json(quizList);
});
