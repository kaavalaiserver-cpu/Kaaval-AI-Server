import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import MagneticButton from '../ui/MagneticButton';
import './Hero.css';

const floatingCards = [
  { text: 'Vehicle Recognition', top: '15%', left: '10%', delay: 0 },
  { text: 'Number Plate Recognition', top: '15%', right: '10%', delay: 0.2 },
  { text: 'Violation Detection', bottom: '25%', left: '12%', delay: 0.4 },
  { text: 'Real-Time Monitoring', bottom: '25%', right: '12%', delay: 0.6 },
];

const Hero = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  // Create a scroll blur effect for when user scrolls past the hero
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const blur = useTransform(scrollYProgress, [0, 1], ['blur(0px)', 'blur(20px)']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const handleMouse = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      setMouse({ x, y });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.section 
      className="hero" 
      id="hero" 
      ref={containerRef}
      style={{ filter: blur, opacity }}
    >
      {/* Cinematic Backgrounds */}
      <div className="hero-bg-noise" />
      <div className="hero-bg-gradient" />
      <div className="hero-glow center-spotlight" />

      <motion.div 
        className="container hero-inner"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }}
      >
        
        {/* ── Visual Centerpiece (Video + Floating Cards) ── */}
        <div className="hero-visual-stage">
          {/* Logo Video with mouse parallax */}
          <motion.div
            className="hero-logo-wrap"
            variants={fadeUp}
            style={{ x: mouse.x, y: mouse.y }}
          >
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src="/assets/kaaval-logo.webm" type="video/webm" />
              <source src="/assets/kaaval-logo.mp4" type="video/mp4" />
            </video>
          </motion.div>

          {/* Floating Capability Cards */}
          {floatingCards.map((card, i) => (
            <motion.div
              key={i}
              className="float-card glass"
              style={{
                top: card.top, bottom: card.bottom, left: card.left, right: card.right
              }}
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1, delay: 0.8 + card.delay, ease: [0.16, 1, 0.3, 1] }}
            >
              {card.text}
            </motion.div>
          ))}
        </div>

        {/* ── Content Block ── */}
        <div className="hero-content">
          <motion.h1 className="hero-title" variants={fadeUp}>
            KAAVAL AI
          </motion.h1>

          <motion.h2 className="hero-heading" variants={fadeUp}>
            Transform Existing Cameras Into<br />
            <span className="hero-accent">Intelligent Traffic Enforcement Systems</span>
          </motion.h2>

          <motion.p className="hero-sub" variants={fadeUp}>
            Upgrade CCTV and ANPR cameras into intelligent monitoring systems.
          </motion.p>

          <motion.div className="hero-ctas" variants={fadeUp}>
            <MagneticButton className="btn-primary">Request Demo</MagneticButton>
          </motion.div>

          {/* Clean minimal upgrade pills */}
          <motion.div className="hero-pills" variants={fadeUp}>
            <div className="minimal-pill">
              <span className="pill-src">Normal CCTV + KED</span>
              <span className="pill-eq">→</span>
              <span className="pill-dst">Smart Camera</span>
            </div>
            <div className="minimal-pill">
              <span className="pill-src">ANPR Camera + KED</span>
              <span className="pill-eq">→</span>
              <span className="pill-dst">Advanced Smart Camera</span>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </motion.section>
  );
};

export default Hero;
