const maskMobile = (mobile) => {
  if (!mobile) return 'N/A';
  const s = String(mobile);
  if (s.length <= 4) return s;
  return s.slice(0, -4).replace(/\d/g, '●') + s.slice(-4);
};

const capitalize = (str) => {
  if (!str) return 'N/A';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
};

const FIELD_ICONS = {
  'Name':           { icon: '👤', color: '#7c3aed', bg: '#f5f0ff' },
  'Gender':         { icon: '⚧',  color: '#ec4899', bg: '#fdf2f8' },
  'Concern':        { icon: '🩺', color: '#10b981', bg: '#f0fdf4' },
  'Problem':        { icon: '💬', color: '#f59e0b', bg: '#fffbeb' },
  'Country':        { icon: '🌍', color: '#0ea5e9', bg: '#f0f9ff' },
  'State':          { icon: '🗺️', color: '#6366f1', bg: '#eef2ff' },
  'City':           { icon: '🏙️', color: '#14b8a6', bg: '#f0fdfa' },
  'Pincode':        { icon: '📮', color: '#f97316', bg: '#fff7ed' },
  'Mobile':         { icon: '📱', color: '#64748b', bg: '#f8fafc' },
};

export default function SummaryPage({ userData, onRestart }) {
  const data = userData || {};

  const fields = [
    { label: 'Name',    value: capitalize(data.name),                      full: false },
    { label: 'Gender',  value: capitalize(data.gender),                    full: false },
    { label: 'Concern', value: capitalize(data.problem_type),              full: false },
    { label: 'Problem', value: capitalize(data.problem_details) || 'N/A', full: true  },
    { label: 'Country', value: capitalize(data.country)         || 'N/A', full: false },
    { label: 'State',   value: capitalize(data.state)           || 'N/A', full: false },
    { label: 'City',    value: capitalize(data.city)            || 'N/A', full: false },
    { label: 'Pincode', value: data.pincode                     || 'N/A', full: false },
    { label: 'Mobile',  value: maskMobile(data.mobile),                    full: false },
  ];

  return (
    <div className="sp-page">
      <div className="sp-card">

        {/* ── Success hero ── */}
        <div className="sp-hero">
          <div className="sp-check-ring">
            <div className="sp-check-circle">
              <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="sp-check-svg">
                <circle cx="26" cy="26" r="24" fill="white" fillOpacity="0.15"/>
                <path d="M14 27l8 8 16-16" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="sp-title">Consultation Complete!</h1>
          <p className="sp-subtitle">
            Your profile has been saved and shared with our specialist.
          </p>
        </div>

        {/* ── Data grid ── */}
        <div className="sp-section">
          <div className="sp-section-label">Your Profile</div>
          <div className="sp-grid">
            {fields.map(({ label, value, full }) => {
              const meta = FIELD_ICONS[label] || { icon: '•', color: '#888', bg: '#f5f5f5' };
              return (
                <div key={label} className={`sp-field${full ? ' sp-field--full' : ''}`}>
                  <div className="sp-field-icon" style={{ background: meta.bg, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="sp-field-body">
                    <div className="sp-field-label">{label}</div>
                    <div className="sp-field-value">{value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── What's next ── */}
        <div className="sp-section">
          <div className="sp-section-label">What happens next</div>
          <div className="sp-steps">
            <div className="sp-step">
              <div className="sp-step-num">1</div>
              <div className="sp-step-body">
                <div className="sp-step-title">Profile Review</div>
                <div className="sp-step-desc">Our certified expert reviews your skin & hair profile within 1 hour.</div>
              </div>
            </div>
            <div className="sp-step-connector" />
            <div className="sp-step">
              <div className="sp-step-num">2</div>
              <div className="sp-step-body">
                <div className="sp-step-title">Expert Call</div>
                <div className="sp-step-desc">You'll receive a call on <strong>{maskMobile(data.mobile)}</strong> within 24 hours.</div>
              </div>
            </div>
            <div className="sp-step-connector" />
            <div className="sp-step">
              <div className="sp-step-num">3</div>
              <div className="sp-step-body">
                <div className="sp-step-title">Personalised Plan</div>
                <div className="sp-step-desc">Get a custom treatment plan tailored to your concern.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <button className="sp-restart-btn" onClick={onRestart}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
          </svg>
          Start New Consultation
        </button>

        <p className="sp-footer-note">🩺 Skinkadoc · AI Skin &amp; Hair Doctor</p>
      </div>
    </div>
  );
}
