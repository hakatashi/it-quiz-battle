import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';
import type {protos} from '@google-cloud/text-to-speech';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Quiz extends DocumentData {
	type: 'it' | 'news';
	question: string;
	answer: string;
	alternativeAnswers: string[];
	description: string | null;
	clauses: string[];
	timepoints: protos.google.cloud.texttospeech.v1beta1.ITimepoint[];
}
