import type {DocumentData, FirestoreError} from 'firebase/firestore';
import type {protos} from '@google-cloud/text-to-speech';

export type Timepoint = protos.google.cloud.texttospeech.v1beta1.ITimepoint;

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Quiz extends DocumentData {
	type: 'it' | 'news';
	index: number;
	question: string;
	answer: string;
	alternativeAnswers: string[];
	description: string | null;
	clauses: string[];
	timepoints: Timepoint[];
	ssml: string;
}
