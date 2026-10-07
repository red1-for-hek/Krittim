'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  useSpeechToText — thin, safe wrapper around the browser Web Speech API     */
/*                                                                            */
/*  • Gracefully no-ops on unsupported browsers (Firefox, most Safari).        */
/*  • Keeps interim + final transcripts separate so hosts can show a live      */
/*    "listening" preview while committing only finalized text.                */
/*  • Auto-restarts when Chrome silently ends a session after a pause.         */
/* -------------------------------------------------------------------------- */

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  /** True once the browser has finalised this result (final vs. interim). */
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechToTextOptions {
  /** BCP-47 tag, defaults to the document language or en-US. */
  lang?: string;
  /** Called with each *finalised* transcript chunk. */
  onTranscript?: (finalChunk: string) => void;
}

export interface UseSpeechToTextResult {
  supported: boolean;
  listening: boolean;
  /** Live partial dictation for the current utterance. */
  interimTranscript: string;
  /** Coarse 0–1 energy proxy driving the mic pulse/waveform. */
  volume: number;
  error: string | null;
  toggle: () => void;
  start: () => void;
  stop: () => void;
}

export function useSpeechToText({ lang, onTranscript }: UseSpeechToTextOptions = {}): UseSpeechToTextResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false); // readable inside stale event closures
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  /* Lazily construct the recognizer once, client-side only. */
  const ensureRecognition = useCallback((): SpeechRecognitionLike | null => {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = lang ?? (typeof document !== 'undefined' ? document.documentElement.lang || 'en-US' : 'en-US');
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          const final = text.trim();
          if (final) onTranscriptRef.current?.(final);
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim.trim());
      // Cheap energy proxy so the waveform reacts without an AudioContext.
      setVolume(interim.length ? Math.min(1, 0.4 + (interim.length % 7) / 10) : 0.25);
    };

    recognition.onerror = (event) => {
      const code = event.error ?? 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone permission denied.');
        listeningRef.current = false;
        setListening(false);
      } else if (code !== 'aborted' && code !== 'no-speech') {
        setError(`Dictation error: ${code}`);
      }
    };

    recognition.onend = () => {
      // Chrome ends sessions on long pauses — restart while the user still wants it on.
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          listeningRef.current = false;
          setListening(false);
        }
      } else {
        setInterimTranscript('');
        setVolume(0);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [lang]);

  const start = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) {
      setError('unsupported');
      return;
    }
    setError(null);
    listeningRef.current = true;
    setListening(true);
    try {
      recognition.start();
    } catch {
      /* InvalidStateError — already running; treat as listening. */
    }
  }, [ensureRecognition]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript('');
    setVolume(0);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* not running — ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  /* Teardown on unmount. */
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  return { supported, listening, interimTranscript, volume, error, toggle, start, stop };
}
