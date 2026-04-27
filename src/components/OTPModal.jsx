import { useState, useEffect, useRef } from 'react';
import { verifyOTP } from '../utils/api';

export default function OTPModal({ mobile: initialMobile, onVerified, onClose }) {
  const [mobile,    setMobile]    = useState(initialMobile || '');
  const [otp,       setOtp]       = useState(['', '', '', '', '', '']);
  const [step,      setStep]      = useState(initialMobile ? 'otp' : 'mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const mobileInputRef = useRef(null);
  const otpRefs        = useRef([]);

  // Focus correct input on step change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'mobile') mobileInputRef.current?.focus();
      if (step === 'otp')    otpRefs.current[0]?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [step]);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Step 1: mobile ────────────────────────────────────────────────────────────
  const handleMobileSubmit = () => {
    setError('');
    const m = mobile.trim().replace(/\s+/g, '');
    if (!m || !/^\+?\d{10,15}$/.test(m)) {
      setError('Please enter a valid 10–15 digit mobile number.');
      return;
    }
    setMobile(m);
    setStep('otp');
  };

  // ── OTP box handlers ──────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp]; next[index] = ''; setOtp(next);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft'  && index > 0) { otpRefs.current[index - 1]?.focus(); }
      else if (e.key === 'ArrowRight' && index < 5) { otpRefs.current[index + 1]?.focus(); }
      else if (e.key === 'Enter' && otp.every(d => d))  { handleOTPSubmit(); }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...pasted.split(''), '', '', '', '', '', ''].slice(0, 6);
    setOtp(next);
    setError('');
    setTimeout(() => otpRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
    e.preventDefault();
  };

  // ── Step 2: verify ────────────────────────────────────────────────────────────
  const handleOTPSubmit = async () => {
    setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }

    setIsLoading(true);
    try {
      const result = await verifyOTP(mobile, code);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onVerified(mobile), 1000);
      } else {
        setError(result.error || 'Incorrect OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Network error. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setIsLoading(false);
    }
  };

  const otpFilled = otp.every(d => d !== '');

  return (
    <div
      className="otp-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-title"
    >
      <div className="otp-card">

        {/* ── Step indicator ── */}
        {!success && (
          <div className="otp-steps">
            <div className={`otp-step ${step === 'mobile' ? 'active' : 'done'}`}>
              <div className="otp-step-dot">{step === 'mobile' ? '1' : '✓'}</div>
              <span>Mobile</span>
            </div>
            <div className="otp-step-line" />
            <div className={`otp-step ${step === 'otp' ? 'active' : ''}`}>
              <div className="otp-step-dot">2</div>
              <span>Verify</span>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {success && (
          <div className="otp-success">
            <div className="otp-success-icon">
              <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="26" cy="26" r="25" stroke="#7c3aed" strokeWidth="2" fill="#f5f0ff"/>
                <path d="M14 27l8 8 16-16" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="otp-success-title">Verified!</h2>
            <p className="otp-success-sub">Mobile confirmed. Completing consultation…</p>
          </div>
        )}

        {/* ── Step 1: Enter mobile ── */}
        {!success && step === 'mobile' && (
          <>
            <div className="otp-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3"/>
              </svg>
            </div>
            <h2 className="otp-title" id="otp-title">Enter Mobile Number</h2>
            <p className="otp-sub">We'll send a verification code to confirm your identity.</p>

            <div className="otp-form-group">
              <label className="otp-label" htmlFor="mobile-input">Mobile Number</label>
              <div className="otp-input-wrap">
                <span className="otp-input-prefix">+91</span>
                <input
                  id="mobile-input"
                  ref={mobileInputRef}
                  className="otp-mobile-input"
                  type="tel"
                  value={mobile.replace(/^\+?91/, '')}
                  onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleMobileSubmit()}
                  placeholder="98765 43210"
                  maxLength={10}
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
              {error && <div className="otp-error">{error}</div>}
            </div>

            <button className="otp-primary-btn" onClick={handleMobileSubmit}>
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button className="otp-ghost-btn" onClick={onClose}>Cancel</button>
          </>
        )}

        {/* ── Step 2: Verify OTP ── */}
        {!success && step === 'otp' && (
          <>
            <div className="otp-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="otp-title" id="otp-title">Verify OTP</h2>
            <p className="otp-sub">
              Code sent to <strong>{mobile}</strong>
              <br/><span className="otp-demo-note">Demo mode — any 6 digits will work.</span>
            </p>

            {/* 6-box OTP input */}
            <div className="otp-boxes" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  className={`otp-box${digit ? ' filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {error && <div className="otp-error" style={{ textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

            <button
              className="otp-primary-btn"
              onClick={handleOTPSubmit}
              disabled={isLoading || !otpFilled}
            >
              {isLoading
                ? <><span className="otp-spinner" /> Verifying…</>
                : <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Verify &amp; Continue
                  </>
              }
            </button>
          </>
        )}

      </div>
    </div>
  );
}
