import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import logo from '../public/Logo.png';
import useSpeech  from '../hooks/useSpeech';
import ChatWindow from './ChatWindow';
import OTPModal   from './OTPModal';
import { sendMessage, saveProfile } from '../utils/api';

const EMPTY_DATA = {
  name: null, gender: null,
  problem_type: null, problem_details: null,
  country: null, state: null, city: null,
  mobile: null,
};

const GREETING = "Welcome to Skinkadoc AI Consultation. Are you facing a Skin problem or a Hair problem?";

export default function VoiceAssistant({ onComplete, onClose }) {
  const [sessionId]     = useState(() => uuidv4());
  const [messages,      setMessages]      = useState([]);
  const [collectedData, setCollectedData] = useState(EMPTY_DATA);
  const [isLoading,     setIsLoading]     = useState(false);
  const [showOTP,       setShowOTP]       = useState(false);
  const [inputText,     setInputText]     = useState('');
  const [voiceStarted,  setVoiceStarted]  = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editableData,     setEditableData]     = useState({});

  const collectedDataRef = useRef(collectedData);
  useEffect(() => { collectedDataRef.current = collectedData; }, [collectedData]);

  const isProcessingRef  = useRef(false);
  const isMountedRef     = useRef(true);
  const shouldAutoListen = useRef(false);   // stays false until user explicitly starts voice
  const greetingShownRef = useRef(false);
  const inputRef         = useRef(null);

  // Reset isMountedRef on every mount (guards against React StrictMode double-invoke)
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const {
    isSupported, isListening, isSpeaking, speechError, interimTranscript,
    startListening, stopListening, speak, stopSpeaking,
  } = useSpeech();

  // Auto-focus the text input whenever the modal is open and not listening/confirming
  useEffect(() => {
    if (!showConfirmation && !isListening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showConfirmation, isListening, isLoading]);

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, {
      id:        `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    }]);
  }, []);

  const handleUserInputRef = useRef(null);

  const beginListening = useCallback(() => {
    if (!isSupported || !shouldAutoListen.current || !isMountedRef.current) return;
    startListening((transcript) => {
      if (transcript && transcript.trim()) {
        handleUserInputRef.current && handleUserInputRef.current(transcript.trim());
      }
    });
  }, [isSupported, startListening]);

  const finishConsultation = useCallback((finalData) => {
    shouldAutoListen.current = false;
    stopListening();
    stopSpeaking();
    onComplete(finalData || collectedDataRef.current);
  }, [stopListening, stopSpeaking, onComplete]);

  const handleUserInput = useCallback(async (text) => {
    if (!text || isProcessingRef.current) return;
    isProcessingRef.current = true;

    stopListening();
    stopSpeaking();
    addMessage('user', text);
    setIsLoading(true);

    try {
      const response = await sendMessage(text, sessionId, collectedDataRef.current);
      if (!isMountedRef.current) return;

      if (response.collected_data) {
        setCollectedData(prev => {
          const next = { ...prev };
          Object.entries(response.collected_data).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') next[k] = v;
          });
          return next;
        });
      }

      const rawAiText = response.message || "Could you say that again?";
      const nextStep  = response.next_step || 'continue';

      // Frontend safety net: if the AI message ever contains "mobile" or "phone number",
      // silently replace it — the OTP modal handles mobile collection, not the chat.
      const MOBILE_RE = /\bmobile\b|\bphone\s*number\b|\bcontact\s*number\b/i;
      const mobileIntercepted = MOBILE_RE.test(rawAiText);
      const aiText = mobileIntercepted
        ? `Thank you${collectedDataRef.current.name ? ', ' + collectedDataRef.current.name : ''}! Your profile is all set. We'll connect you with our expert right away. 😊`
        : rawAiText;
      // If we intercepted a mobile-ask, force confirm_details step
      const effectiveStep = mobileIntercepted ? 'confirm_details' : nextStep;

      addMessage('ai', aiText);
      setIsLoading(false);
      // Re-focus input after every AI reply so user can type immediately
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);

      if (effectiveStep === 'otp_verification') {
        shouldAutoListen.current = false;
        isProcessingRef.current  = false;
        if (isSupported) speak(aiText, () => { if (isMountedRef.current) setShowOTP(true); });
        else setShowOTP(true);
      } else if (effectiveStep === 'complete') {
        shouldAutoListen.current = false;
        isProcessingRef.current  = false;
        if (isSupported) speak(aiText, () => { if (isMountedRef.current) setTimeout(() => finishConsultation(), 1500); });
        else setTimeout(() => finishConsultation(), 1500);
      } else if (effectiveStep === 'confirm_details') {
        // All fields except mobile collected — stop voice, show editable summary
        shouldAutoListen.current = false;
        isProcessingRef.current  = false;
        stopListening();
        if (isSupported) speak(aiText, null);
        setEditableData({ ...collectedDataRef.current });
        setShowConfirmation(true);
      } else {
        isProcessingRef.current = false;
        // Speak first, open mic ONLY after TTS finishes.
        // Running STT simultaneously causes the bot's own voice to be picked up
        // by the microphone and echoed back as a user message.
        if (isSupported) {
          speak(aiText, () => { if (isMountedRef.current) beginListening(); });
        } else {
          beginListening();
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (!isMountedRef.current) return;
      // Server returns { message, next_step, collected_data } even on 5xx — use that message if available
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error   ||
        "I'm sorry, something went wrong. Please try again.";
      addMessage('ai', errMsg);
      setIsLoading(false);
      isProcessingRef.current = false;
      if (isSupported) {
        speak(errMsg, () => { if (isMountedRef.current) beginListening(); });
      } else {
        beginListening();
      }
    }
  }, [sessionId, isSupported, addMessage, stopListening, speak, beginListening, finishConsultation]);

  useEffect(() => {
    handleUserInputRef.current = handleUserInput;
  }, [handleUserInput]);

  useEffect(() => {
    if (greetingShownRef.current) return;
    greetingShownRef.current = true;
    // Show greeting text immediately.
    // Do NOT auto-speak the greeting — browsers block TTS that isn't directly
    // triggered by a user gesture (useEffect/setTimeout = no gesture context).
    // All subsequent AI replies are spoken because they fire from handleUserInput
    // which is always called in response to a user action.
    addMessage('ai', GREETING);
  }, []);

  const handleOTPVerified = useCallback(async (mobile) => {
    setShowOTP(false);
    const updated = { ...collectedDataRef.current, mobile };
    setCollectedData(updated);
    try {
      await saveProfile({ ...updated, session_id: sessionId });
    } catch (err) {
      console.error('Profile save failed:', err);
      // Still complete the flow — don't block the user
      addMessage('ai', '⚠️ There was an issue saving your profile. Our team will follow up manually.');
    }
    const finalMsg = "Thank you! Your consultation is complete. Our expert will review your details and contact you shortly. Have a great day!";
    addMessage('ai', finalMsg);
    if (isSupported) {
      speak(finalMsg, () => { if (isMountedRef.current) setTimeout(() => finishConsultation(updated), 1500); });
    } else {
      setTimeout(() => finishConsultation(updated), 2000);
    }
  }, [sessionId, isSupported, addMessage, speak, finishConsultation]);

  const handleConfirmDetails = useCallback(() => {
    // Apply any edits the user made, then go straight to mobile/OTP entry
    const confirmed = { ...editableData };
    setCollectedData(confirmed);
    collectedDataRef.current = confirmed;
    setShowConfirmation(false);
    setShowOTP(true); // OTPModal already handles typed mobile + OTP
  }, [editableData]);

  const handleManualSend = useCallback(() => {    const text = inputText.trim();
    if (!text || isLoading) return;
    // Unlock TTS synchronously inside the user gesture before going async
    window.speechSynthesis?.cancel();
    setInputText('');
    handleUserInput(text);
  }, [inputText, isLoading, handleUserInput]);

  // Called when user taps "Start Voice Chat" — this click IS a user gesture so TTS is allowed
  const handleStartVoice = useCallback(() => {
    if (!isSupported) return;
    setVoiceStarted(true);
    shouldAutoListen.current = true;
    stopListening();   // close any stale mic before speaking the greeting
    speak(GREETING, () => {
      if (isMountedRef.current) beginListening();
    });
  }, [isSupported, speak, stopListening, beginListening]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (!isProcessingRef.current && !isLoading) {
      stopSpeaking();
      shouldAutoListen.current = true;
      if (isMountedRef.current) beginListening();
    }
  }, [isListening, isLoading, stopListening, stopSpeaking, beginListening]);

  const handleClose = () => {
    shouldAutoListen.current = false;
    stopListening();
    stopSpeaking();
    onClose();
  };

  const statusLabel = isListening ? 'Listening…'
    : isSpeaking   ? 'Speaking…'
    : isLoading    ? 'Thinking…'
    : voiceStarted ? 'Ready — tap mic or type'
    : 'Tap mic to start voice chat';

  const statusClass = isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle';

  /* quick-reply chips shown before conversation starts */
  const quickReplies = [
    { icon: '💆', text: 'I have a skin concern' },
    { icon: '💇', text: 'I have a hair concern' },
    { icon: '✨', text: 'I want personalised advice' },
  ];

  return (
    <>
      <div className="chat-modal-backdrop" onClick={handleClose} />
      <div className="chat-modal" role="dialog" aria-modal="true" aria-label="Skinkadoc Consultation">

        {/* ── Header bar ── */}
        <div className="cm-header">
          <div className="cm-header-left">
            <div className="cm-avatar">
              <img src={logo} alt="Skinkadoc" className="cm-avatar-logo" />
              <span className="cm-avatar-dot" />
            </div>
            <div>
              <div className="cm-name">Skinkadoc</div>
              <div className={`cm-status ${statusClass}`}>{statusLabel}</div>
            </div>
          </div>
          <button className="cm-chevron" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* ── Greeting hero (hidden once chat starts) ── */}
        {!showConfirmation && messages.length === 0 && !isLoading && (
          <div className="cm-greeting">
            <div className="cm-greeting-icon">
              <img src={logo} alt="Skinkadoc" className="cm-greeting-logo" />
            </div>
            <h2 className="cm-greeting-title">Hello 👋</h2>
            <p className="cm-greeting-sub">How can I help you today?</p>

            <div className="cm-quick-replies">
              {quickReplies.map((q) => (
                <button
                  key={q.text}
                  className="cm-quick-btn"
                  onClick={() => { window.speechSynthesis?.cancel(); handleUserInput(q.text); }}
                >
                  <span className="cm-quick-arrow">↗</span>
                  <span>{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Message thread (shown once chat starts, hidden during confirmation) ── */}
        {!showConfirmation && (messages.length > 0 || isLoading) && (
          <ChatWindow messages={messages} isLoading={isLoading} />
        )}

        {/* ── Confirmation / edit panel ── */}
        {showConfirmation && (
          <div className="cm-confirm-panel">
            <div className="cm-confirm-header">
              <div className="cm-confirm-icon-wrap">📋</div>
              <div>
                <h3 className="cm-confirm-title">Review Your Details</h3>
                <p className="cm-confirm-sub">Edit anything before we proceed</p>
              </div>
            </div>

            <div className="cm-confirm-fields">
              <div className="cm-confirm-row">
                <label>Concern</label>
                <select
                  value={editableData.problem_type || ''}
                  onChange={e => setEditableData(d => ({ ...d, problem_type: e.target.value }))}
                >
                  <option value="Skin">Skin</option>
                  <option value="Hair">Hair</option>
                </select>
              </div>
              <div className="cm-confirm-row">
                <label>Problem</label>
                <input
                  type="text"
                  value={editableData.problem_details || ''}
                  onChange={e => setEditableData(d => ({ ...d, problem_details: e.target.value }))}
                  placeholder="e.g. acne, hair fall…"
                />
              </div>
              <div className="cm-confirm-row">
                <label>Name</label>
                <input
                  type="text"
                  value={editableData.name || ''}
                  onChange={e => setEditableData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="cm-confirm-row">
                <label>Country</label>
                <input
                  type="text"
                  value={editableData.country || ''}
                  onChange={e => setEditableData(d => ({ ...d, country: e.target.value }))}
                  placeholder="e.g. India"
                />
              </div>
              <div className="cm-confirm-row">
                <label>State</label>
                <input
                  type="text"
                  value={editableData.state || ''}
                  onChange={e => setEditableData(d => ({ ...d, state: e.target.value }))}
                  placeholder="e.g. Maharashtra"
                />
              </div>
              <div className="cm-confirm-row">
                <label>City</label>
                <input
                  type="text"
                  value={editableData.city || ''}
                  onChange={e => setEditableData(d => ({ ...d, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div className="cm-confirm-row">
                <label>Gender</label>
                <select
                  value={
                    /female|woman|girl/i.test(editableData.gender || '') ? 'Female'
                    : /male|man|boy/i.test(editableData.gender || '')   ? 'Male'
                    : editableData.gender ? 'Other' : ''
                  }
                  onChange={e => setEditableData(d => ({ ...d, gender: e.target.value }))}
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>

            <button className="cm-confirm-proceed-btn" onClick={handleConfirmDetails}>
              ✓ Confirm &amp; Enter Mobile Number
            </button>
          </div>
        )}

        {/* ── Footer input area — hidden during confirmation ── */}
        {!showConfirmation && (
        <div className="cm-footer">
          {/* Mic action row — shown after voice started */}
          {isSupported && voiceStarted && (
            <div className="cm-mic-bar">
              <div className="cm-mic-wrapper">
                <button
                  className={`cm-mic-btn${isListening ? ' listening' : ''}`}
                  onClick={handleMicToggle}
                  disabled={isLoading}
                  aria-label={isListening ? 'Stop listening' : 'Tap mic to speak'}
                >
                  {isListening
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  }
                </button>
                {isListening && <div className="cm-ripple"><span/><span/><span/></div>}
              </div>
              <span className="cm-mic-label">
                {isListening ? 'Listening…' : isSpeaking ? 'Speaking…' : 'Tap to speak'}
              </span>
            </div>
          )}

          {/* Text box */}
          <div className={`cm-input-box${isListening ? ' is-listening' : ''}`}>
            <input
              ref={inputRef}
              className="cm-input"
              type="text"
              value={isListening ? interimTranscript : inputText}
              onChange={isListening ? undefined : e => setInputText(e.target.value)}
              onKeyDown={isListening ? undefined : e => e.key === 'Enter' && handleManualSend()}
              placeholder={isListening ? 'Listening…' : 'Message Skinkadoc…'}
              readOnly={isListening}
              disabled={isLoading && !isListening}
              aria-label="Type your message"
            />
            <div className="cm-input-actions">
              {/* Voice start icon (before voice started) */}
              {isSupported && !voiceStarted && (
                <button className="cm-icon-btn cm-voice-icon" onClick={handleStartVoice} aria-label="Start voice chat" title="Start voice chat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>
              )}
              <button
                className="cm-send-btn"
                onClick={handleManualSend}
                disabled={(!inputText.trim() && !interimTranscript) || isLoading || isListening}
                aria-label="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>

          <p className="cm-disclaimer">Skinkadoc can make mistakes. Double-check replies.</p>
        </div>
        )}

      </div>

      {showOTP && (
        <OTPModal
          mobile={collectedDataRef.current.mobile}
          onVerified={handleOTPVerified}
          onClose={() => {
            setShowOTP(false);
            isProcessingRef.current = false;
          }}
        />
      )}
    </>
  );
}
