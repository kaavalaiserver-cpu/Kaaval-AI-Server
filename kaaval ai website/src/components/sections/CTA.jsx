import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import './CTA.css';

const CTA = () => {
  return (
    <section className="cta" id="cta">
      <div className="cta-glow" />
      <motion.div 
        className="container cta-inner"
        initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cta-logo-wrap">
          <Shield size={48} strokeWidth={1.5} className="cta-logo-icon" />
          <div className="cta-logo-glow" />
        </div>
        
        <h2 className="cta-title">
          Ready to Transform Existing Cameras<br />
          Into Intelligent Enforcement Systems?
        </h2>
        
        <div className="cta-buttons">
          <button className="btn btn-primary cta-btn">Request a Demo</button>
          <button className="btn btn-secondary cta-btn">Contact Sales</button>
        </div>
      </motion.div>
    </section>
  );
};

export default CTA;
