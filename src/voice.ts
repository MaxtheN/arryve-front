/* Shared Arvy voice helpers used by the landing page and all 4 pitch decks
   (PitchDeck.tsx, PitchDeckRu, PitchDeckUz, PitchDeckSales).

   playArvyVoice plays a recorded MP3 from /public/voices/.
   stopArvyVoice stops whatever audio (or TTS) is currently playing.
   speakArvy falls back to browser speech synthesis for any content that
   doesn't have a recording yet — kept so the Try-a-call chips still
   work for KB entries without audio. */

let arvyAudio: HTMLAudioElement | null = null;

type VoiceCallbacks = { onStart?: () => void; onEnd?: () => void };

export function playArvyVoice(src: string, callbacks: VoiceCallbacks = {}) {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    callbacks.onEnd?.();
    return;
  }
  // Stop any TTS that might still be running.
  window.speechSynthesis?.cancel();
  // Stop any currently-playing audio so the new one preempts cleanly.
  if (arvyAudio) {
    arvyAudio.pause();
    arvyAudio.currentTime = 0;
    arvyAudio.src = '';
    arvyAudio = null;
  }
  const audio = new Audio(src);
  arvyAudio = audio;
  audio.preload = 'auto';
  audio.addEventListener('playing', () => callbacks.onStart?.(), { once: true });
  const done = () => {
    if (arvyAudio === audio) arvyAudio = null;
    callbacks.onEnd?.();
  };
  audio.addEventListener('ended', done, { once: true });
  audio.addEventListener('error', done, { once: true });
  const p = audio.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => done());
  }
}

export function stopArvyVoice() {
  if (arvyAudio) {
    arvyAudio.pause();
    arvyAudio.currentTime = 0;
    arvyAudio.src = '';
    arvyAudio = null;
  }
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
}

export function speakArvy(text: string, callbacks: VoiceCallbacks = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    callbacks.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.02;
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.name === 'Samantha') ||
    voices.find((v) => v.lang === 'en-US' && /female/i.test(v.name)) ||
    voices.find((v) => v.name.includes('Google UK English Female')) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (voice) utter.voice = voice;
  utter.onstart = () => callbacks.onStart?.();
  utter.onend = () => callbacks.onEnd?.();
  utter.onerror = () => callbacks.onEnd?.();
  synth.speak(utter);
}

/* Canonical voice sources. Keep paths here so adding/renaming files
   only needs one change. */
export const VOICES = {
  hero: '/voices/hero.mp3',
  checkIn: '/voices/check-in.mp3',
  breakfast: '/voices/breakfast.mp3',
  parking: '/voices/parking.mp3',
  pets: '/voices/pets.mp3',
} as const;
