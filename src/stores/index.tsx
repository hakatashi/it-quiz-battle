import {createSignal} from 'solid-js';

type Scene = 'home' | 'quiz' | 'result';

const [scene, setScene] = createSignal<Scene>('home');

export {scene, setScene};
