import {isServer} from 'solid-js/web';
import {initializeApp} from 'firebase/app';
import {connectAuthEmulator, getAuth, signInAnonymously} from 'firebase/auth';
import {
	getFirestore,
	connectFirestoreEmulator,
	collection,
	type CollectionReference,
} from 'firebase/firestore';
import type {Quiz} from './schema.ts';
import {connectStorageEmulator, getStorage} from 'firebase/storage';

const firebaseConfigResponse = await fetch('/__/firebase/init.json');
const firebaseConfig = await firebaseConfigResponse.json();

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

if (import.meta.env.DEV && !isServer) {
	connectFirestoreEmulator(db, 'localhost', 8080);
	connectStorageEmulator(storage, 'localhost', 9199);
	connectAuthEmulator(auth, 'http://localhost:9099');
}

const Quizzes = collection(db, 'quizzes') as CollectionReference<Quiz>;

await signInAnonymously(auth);

export {app as default, auth, db, storage, Quizzes};
