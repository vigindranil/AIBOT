import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSpeech — Web Speech API hook
 * Provides speech-to-text (recognition) and text-to-speech (synthesis).
 * Designed to work in Chromium-based browsers where the API is fully supported.
 */
export default function useSpeech() {
  // Check support synchronously so the UI can render the correct state immediately
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const [isSupported]  = useState(!!SpeechRecognition && !!window?.speechSynthesis);
  const [isListening,  setIsListening]  = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [speechError,  setSpeechError]  = useState(null);

  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef   = useRef(null);
  const synthRef         = useRef(null);
  const onResultRef      = useRef(null);
  const utteranceRef     = useRef(null);
  const silenceTimerRef  = useRef(null);
  const finalTextRef     = useRef('');
  const shouldRestartRef = useRef(false);  // true while mic should stay open
  const intentionalRef   = useRef(false);  // true when we deliberately abort/stop

  // ── Initialise APIs ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    synthRef.current = window.speechSynthesis;

    const rec = new SpeechRecognition();
    rec.continuous      = true;   // keep mic open so user can speak full sentences
    rec.interimResults  = true;   // show live transcript as user speaks
    rec.lang            = 'en-IN'; // Indian English — understands Indian accent
    rec.maxAlternatives = 3;   // pick highest-confidence alternative

    rec.onstart = () => {
      intentionalRef.current = false;
      setIsListening(true);
      setSpeechError(null);
    };

    rec.onend = () => {
      // Auto-restart if recognition stopped unexpectedly mid-session
      if (shouldRestartRef.current && !intentionalRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current && !intentionalRef.current) {
            try { rec.start(); } catch { /* ignore */ }
          }
        }, 250);
        return;
      }
      setIsListening(false);
      setInterimTranscript('');
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;  // intentional abort — ignore
      if (e.error === 'no-speech') {
        // Silently restart on no-speech if we're still expecting input
        if (shouldRestartRef.current && !intentionalRef.current) {
          try { rec.abort(); } catch { /* ignore */ }
          setTimeout(() => {
            if (shouldRestartRef.current && !intentionalRef.current) {
              try { rec.start(); } catch { /* ignore */ }
            }
          }, 300);
        }
        return;
      }
      shouldRestartRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setSpeechError(`Microphone error: ${e.error}`);
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          // Pick the alternative with highest confidence
          let bestText = e.results[i][0].transcript;
          let bestConf = e.results[i][0].confidence;
          for (let a = 1; a < e.results[i].length; a++) {
            if (e.results[i][a].confidence > bestConf) {
              bestConf = e.results[i][a].confidence;
              bestText = e.results[i][a].transcript;
            }
          }
          // Accept if confidence is good, or browser doesn't report it (returns 0)
          if (bestConf === 0 || bestConf >= 0.35) {
            finalTextRef.current += bestText + ' ';
          }
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setInterimTranscript(finalTextRef.current + interim);

      // Reset the 2.2 s silence timer (more natural than 1.5 s)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = (finalTextRef.current + interim).trim();
        finalTextRef.current = '';
        setInterimTranscript('');
        shouldRestartRef.current = false;
        intentionalRef.current   = true;
        try { rec.stop(); } catch { /* ignore */ }
        if (text && text.length >= 2 && onResultRef.current) onResultRef.current(text);
      }, 2200);
    };

    recognitionRef.current = rec;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      shouldRestartRef.current = false;
      intentionalRef.current   = true;
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
      synthRef.current?.cancel();
    };
  }, [isSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speech-to-Text ────────────────────────────────────────────────────────────
  const startListening = useCallback((onResult) => {
    if (!recognitionRef.current) return;
    onResultRef.current      = onResult;
    finalTextRef.current     = '';
    shouldRestartRef.current = true;
    intentionalRef.current   = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    try { recognitionRef.current.abort(); } catch { /* ignore */ }

    setTimeout(() => {
      if (shouldRestartRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.warn('Recognition start error:', err.message);
        }
      }
    }, 150);
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    shouldRestartRef.current = false;
    intentionalRef.current   = true;
    finalTextRef.current     = '';
    setInterimTranscript('');
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  // ── Text-to-Speech ────────────────────────────────────────────────────────────
  const speak = useCallback((text, onEnd) => {
    if (!synthRef.current || !text) {
      onEnd?.();
      return;
    }

    // Cancel anything currently being spoken
    synthRef.current.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate   = 0.90;
      utterance.pitch  = 1.10;
      utterance.volume = 1.0;
      utterance.lang   = 'en-IN'; // Indian English TTS

      // Priority: Indian female voice → any Indian English → Google US English → any English
      const voices = synthRef.current.getVoices();
      const preferred =
        voices.find(v => v.lang === 'en-IN' && /female|woman|raveena|heera|priya|aditi/i.test(v.name)) ||
        voices.find(v => v.lang === 'en-IN') ||
        voices.find(v => v.name.includes('Google UK English Female')) ||
        voices.find(v => v.name.includes('Microsoft Zira'))  ||
        voices.find(v => v.name.includes('Microsoft Aria'))  ||
        voices.find(v => v.name.includes('Samantha'))        ||
        voices.find(v => /female|woman/i.test(v.name) && v.lang?.startsWith('en')) ||
        voices.find(v => v.lang?.startsWith('en')) ||
        voices[0];

      if (preferred) utterance.voice = preferred;

      // Guard so onEnd is called at most once (onend + safety timer race)
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        setIsSpeaking(false);
        onEnd?.();
      };

      let ttsStarted = false;
      utterance.onstart = () => { ttsStarted = true; setIsSpeaking(true); };
      utterance.onend   = settle;
      utterance.onerror = (e) => { console.warn('TTS error:', e.error); settle(); };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);

      // Safety: Chrome blocks TTS when not triggered by a user gesture.
      // If TTS never starts within 2.5 s, call onEnd so the flow continues.
      setTimeout(() => { if (!ttsStarted) settle(); }, 2500);
    };

    // Voices may not be loaded on the first call — wait if necessary
    if (synthRef.current.getVoices().length > 0) {
      doSpeak();
    } else {
      synthRef.current.onvoiceschanged = () => {
        synthRef.current.onvoiceschanged = null;
        doSpeak();
      };
      // Fallback timeout in case onvoiceschanged never fires
      setTimeout(() => {
        if (!isSpeaking) doSpeak();
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isSupported,
    isListening,
    isSpeaking,
    speechError,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
