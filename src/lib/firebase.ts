import {isServer} from 'solid-js/web';
import {initializeApp} from 'firebase/app';
import {connectAuthEmulator, getAuth, signInAnonymously} from 'firebase/auth';
import {
	getFirestore,
	connectFirestoreEmulator,
	collection,
	type CollectionReference,
} from 'firebase/firestore';
import type {Game, GameQuiz, Quiz} from './schema.ts';
import {connectStorageEmulator, getStorage} from 'firebase/storage';
import {
	connectFunctionsEmulator,
	getFunctions,
	type HttpsCallable,
	httpsCallable,
} from 'firebase/functions';

const firebaseConfigResponse = await fetch('/__/firebase/init.json');
const firebaseConfig = await firebaseConfigResponse.json();

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

if (import.meta.env.DEV && !isServer) {
	connectFirestoreEmulator(db, 'localhost', 8080);
	connectStorageEmulator(storage, 'localhost', 9199);
	connectAuthEmulator(auth, 'http://localhost:9099', {disableWarnings: true});
	connectFunctionsEmulator(functions, 'localhost', 5001);
}

const Quizzes = collection(db, 'quizzes') as CollectionReference<Quiz>;
const Games = collection(db, 'games') as CollectionReference<Game>;
const GameQuizzes = (game: CollectionReference<Game>) =>
	collection(game, 'quizzes') as CollectionReference<GameQuiz>;

const createGame = httpsCallable(functions, 'createGame') as HttpsCallable<
	never,
	{gameIndex: number}
>;

await signInAnonymously(auth);

export {
	app as default,
	auth,
	db,
	storage,
	functions,
	Quizzes,
	Games,
	GameQuizzes,
	createGame,
};
