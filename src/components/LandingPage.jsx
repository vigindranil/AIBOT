import { useEffect, useRef, useState, useCallback } from 'react';
import logo from '../public/Logo.png';
import img2 from '../public/img2.png';
import img3 from '../public/img3.png';
import img4 from '../public/img4.png';
import img5 from '../public/img5.png';
import img6 from '../public/img6.png';
import img7 from '../public/img7.png';
import '../styles/LandingPage.css';

/* ── 3D Mouse-Tilt Hook ─────────────────────────────────────────────────── */
function useTilt(strength = 14) {
  const ref   = useRef(null);
  const frame = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current; if (!el) return;
      const r  = el.getBoundingClientRect();
      const x  = (e.clientX - r.left) / r.width  - 0.5;
      const y  = (e.clientY - r.top)  / r.height - 0.5;
      el.style.transform =
        `perspective(700px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) scale3d(1.03,1.03,1.03)`;
    });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (ref.current) {
      ref.current.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1)';
      ref.current.style.transform  = '';
      setTimeout(() => { if (ref.current) ref.current.style.transition = ''; }, 600);
    }
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

/* ── Feature Card ───────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, num }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <div ref={ref} className="feat-card" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <span className="feat-num">{num}</span>
      <div className="feat-icon-wrap">{icon}</div>
      <h3 className="feat-title">{title}</h3>
      <p className="feat-desc">{desc}</p>
    </div>
  );
}

/* ── Review Card ────────────────────────────────────────────────────────── */
function ReviewCard({ stars, text, name, role, delay }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(7);
  return (
    <div
      ref={ref}
      className="review-card"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      data-reveal="up"
      data-delay={delay}
    >
      <div className="r-stars">{'★'.repeat(stars)}</div>
      <p className="r-text">{text}</p>
      <div className="r-divider" />
      <div className="r-name">{name}</div>
      <div className="r-role">{role}</div>
    </div>
  );
}

/* ── Scroll Reveal Hook ─────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Landing Page ───────────────────────────────────────────────────────── */
export default function LandingPage({ onStart }) {
  const [scrolled, setScrolled]     = useState(false);
  const heroImgRef                   = useRef(null);
  const ctaBgRef                     = useRef(null);

  useScrollReveal();

  /* Navbar + parallax scroll */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        setScrolled(sy > 70);
        if (heroImgRef.current)
          heroImgRef.current.style.transform = `translateY(${sy * 0.38}px)`;
        if (ctaBgRef.current) {
          const top = ctaBgRef.current.closest('section').getBoundingClientRect().top;
          ctaBgRef.current.style.transform = `translateY(${-top * 0.25}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* 3D depth effect on gallery items as they enter viewport */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity    = '1';
          e.target.style.transform  = 'none';
        }
      }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.gal-item').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const features = [
    { num: '01', icon: '🎤', title: 'Voice-Powered AI',  desc: 'Speak naturally — our AI hears your concerns and responds like a real skin doctor, any time.' },
    { num: '02', icon: '🧠', title: 'Smart Diagnosis',   desc: 'Advanced AI analyses skin type, hair texture, and lifestyle for fully personalised advice.' },
    { num: '03', icon: '⚡', title: 'Instant Results',   desc: 'Complete your consultation in minutes. No appointments, no waiting rooms, no paperwork.' },
    { num: '04', icon: '🔒', title: 'Private & Secure',  desc: 'End-to-end encrypted. Your data is never shared without your explicit consent.' },
  ];

  const steps = [
    { num: '01', title: 'Open Skinkadoc',      desc: 'Tap the chat button — no sign-up needed to get started.' },
    { num: '02', title: 'Speak Your Concern',  desc: 'Talk naturally about your skin or hair issue in any language.' },
    { num: '03', title: 'Verify with OTP',     desc: 'Confirm your identity with a quick one-time mobile OTP.' },
    { num: '04', title: 'Expert Calls You',    desc: 'A certified specialist reviews your case and calls you back.' },
  ];

  const testimonials = [
    { stars: 5, text: '"I was amazed how natural the conversation felt. Got brilliant advice for my acne in under 5 minutes!"', name: 'Priya S.',  role: 'Skin Consultation', delay: '0' },
    { stars: 5, text: '"The AI understood my hair fall issue perfectly and the expert called me the same day. Incredible!"',    name: 'Rajan M.',  role: 'Hair Consultation', delay: '1' },
    { stars: 5, text: '"So easy — I just spoke and it did everything. Felt like talking to a real dermatologist."',            name: 'Ananya K.', role: 'Skin Consultation', delay: '2' },
  ];

  const gallery = [
    { src: img2, label: 'Nourishing Hair Oil', reveal: 'left',  span: 'tall' },
    { src: img3, label: 'Glow Serum',          reveal: 'up',    span: '' },
    { src: img4, label: 'Hydra Cream',         reveal: 'right', span: 'tall' },
    { src: img5, label: 'Repair Mask',         reveal: 'up',    span: '' },
    { src: img6, label: 'Brightening Oil',     reveal: 'up',    span: '' },
    { src: img7, label: 'Scalp Treatment',     reveal: 'up',    span: '' },
  ];

  const marqueeItems = [
    'Voice Consultations', 'AI Skin Analysis', 'Certified Specialists',
    'Hair Restoration',    'Glow Protocols',   'Same-Day Callback', 'Trusted Across India',
  ];

  return (
    <div className="landing">

      {/* ── Navbar ── */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-logo">
          <img src={logo} alt="Skinkadoc" className="nav-logo-img" />
          Skinkadoc
        </div>
        <div className="nav-links">
          <a href="#gallery">Gallery</a>
          <a href="#features">Features</a>
          <a href="#how">Process</a>
          <a href="#reviews">Reviews</a>
        </div>
        <button className="nav-cta" onClick={onStart}>Consult Now</button>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" id="home">
        <div className="hero-img-wrap">
          <img ref={heroImgRef} className="hero-img" src={img6} alt="Skinkadoc hero" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            AI-Powered · Voice-First · Personalised
          </div>
          <h1 className="hero-title">
            Your Personal<br />
            <em>Skin &amp; Hair</em><br />
            Expert, Anytime
          </h1>
          <p className="hero-sub">
            Just speak. Our AI listens, understands your concern, and connects
            you with a certified specialist — all in minutes.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onStart}>🎤 Start Voice Consultation</button>
            <a href="#how" className="btn-outline">How it works ↓</a>
          </div>
        </div>
        <div className="hero-scroll-hint">
          <div className="scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── Marquee Strip ── */}
      <div className="marquee-strip" aria-hidden="true">
        <div className="marquee-inner">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="marquee-item">
              {item}
              <span className="marquee-sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── About Split ── */}
      <section className="about-section">
        <div className="about-img-wrap" data-reveal="left">
          <img src={img7} alt="Skinkadoc product" className="about-img" />
          <div className="about-img-accent" />
        </div>
        <div className="about-copy">
          <span className="about-tag">Our Story</span>
          <h2 className="about-heading">
            Expert Care,<br /><em>Reimagined</em> for India
          </h2>
          <p className="about-text">
            Skinkadoc bridges the gap between you and certified dermatologists. Describe
            your concern by voice, and our AI instantly analyses your skin type, hair
            texture, and lifestyle to deliver personalised recommendations — no waiting
            rooms, no guesswork.
          </p>
          <p className="about-text">
            Every recommendation is reviewed by board-certified specialists who call you
            back the same day. Luxury care, accessible to everyone.
          </p>
          <div className="stats-grid">
            {[
              { num: '50K+',   label: 'Happy Patients'       },
              { num: '200+',   label: 'Certified Specialists' },
              { num: '4.9★',  label: 'Average Rating'        },
              { num: '<5 min', label: 'Time to Consult'       },
            ].map((s, i) => (
              <div key={s.label} className="stat-box" data-reveal="up" data-delay={String(i % 3)}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section className="gallery-section" id="gallery">
        <p className="eyebrow light" data-reveal="up">Products &amp; Results</p>
        <h2 className="section-title light" data-reveal="up" data-delay="1">
          Trusted by <em>Thousands</em><br />Across India
        </h2>
        <div className="gallery-grid">
          {gallery.map((item, i) => (
            <div
              key={i}
              className={`gal-item${item.span === 'tall' ? ' gal-tall' : ''}`}
              style={{ transitionDelay: `${(i % 3) * 0.12}s` }}
            >
              <img src={item.src} alt={item.label} loading="lazy" />
              <div className="gal-overlay">
                <span className="gal-label">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <p className="eyebrow" data-reveal="up">Why Skinkadoc</p>
        <h2 className="section-title" data-reveal="up" data-delay="1">
          Expert Care, <em>Redefined</em>
        </h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Process ── */}
      <section className="process-section" id="how">
        <p className="eyebrow" data-reveal="up">Process</p>
        <h2 className="section-title" data-reveal="up" data-delay="1">
          Simple. <em>Fast.</em> Effective.
        </h2>
        <div className="process-track">
          {steps.map((s, i) => (
            <div key={s.num} className="step-item" data-reveal="up" data-delay={String(i)}>
              <div className="step-circle">{s.num}</div>
              <div className="step-connector" />
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="reviews-section" id="reviews">
        <p className="eyebrow light" data-reveal="up">Testimonials</p>
        <h2 className="section-title light" data-reveal="up" data-delay="1">
          Loved Across <em>India</em>
        </h2>
        <div className="reviews-grid">
          {testimonials.map((t) => <ReviewCard key={t.name} {...t} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <img ref={ctaBgRef} className="cta-bg" src={img6} alt="" aria-hidden="true" />
        <div className="cta-overlay" />
        <div className="cta-content" data-reveal="scale">
          <h2 className="cta-title">Ready for Your <em>Glow-Up?</em></h2>
          <p className="cta-sub">Free consultation · No appointments · Expert care on demand</p>
          <button className="btn-primary btn-lg" onClick={onStart}>✨ Get Started Free</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-logo">
          <img src={logo} alt="Skinkadoc" className="footer-logo-img" />
          Skinkadoc
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-copy">© 2026 Skinkadoc · AI-Powered Skin &amp; Hair Care</div>
      </footer>

      {/* ── Floating Chat Button ── */}
      <button className="float-btn" onClick={onStart} aria-label="Start consultation">
        <span className="float-icon">
          <img src={logo} alt="" className="float-logo-img" />
        </span>
        <span className="float-text">
          <span className="float-label">Chat with Skinkadoc</span>
          <span className="float-sub">AI Skin &amp; Hair Doctor</span>
        </span>
      </button>

    </div>
  );
}