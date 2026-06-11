import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import MagneticButton from '../ui/MagneticButton';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="container nav-container">
        <a href="/" className="nav-logo">
          <Shield size={22} className="nav-logo-icon" />
          <span>KAAVAL AI</span>
        </a>
        <div className="nav-right">
          <a href="#technology" className="nav-link">Technology</a>
          <a href="#difference" className="nav-link">Solutions</a>
          <a href="#use-cases" className="nav-link">Industries</a>
          <a href="#company" className="nav-link">Company</a>
          <MagneticButton className="btn-primary nav-cta">Request Demo</MagneticButton>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
