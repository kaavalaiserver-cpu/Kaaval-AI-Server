import React from 'react';
import { motion } from 'framer-motion';
import './Showcase.css';

const words = ['Monitor', 'Manage', 'Analyze', 'Act'];

const Showcase = () => (
  <section className="showcase" id="showcase">
    <div className="container showcase-inner">
      {/* Big animated words */}
      <div className="showcase-words">
        {words.map((w, i) => (
          <motion.h2
            key={i}
            className="showcase-word"
            initial={{ opacity: 0, x: -60, filter: 'blur(12px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}<span className="word-dot">.</span>
          </motion.h2>
        ))}
      </div>

      {/* Dashboard mockup */}
      <motion.div
        className="showcase-device"
        initial={{ opacity: 0, y: 80, scale: 0.95, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="device-frame">
          <div className="device-notch"></div>
          <div className="device-screen">
            <div className="ui-top-bar"></div>
            <div className="ui-main">
              <div className="ui-side"></div>
              <div className="ui-content-area">
                <div className="ui-metric-row">
                  <div className="ui-metric-card"></div>
                  <div className="ui-metric-card"></div>
                  <div className="ui-metric-card"></div>
                </div>
                <div className="ui-wide-card"></div>
                <div className="ui-chart-area">
                  <div className="chart-line"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="device-shadow"></div>
      </motion.div>
    </div>
  </section>
);

export default Showcase;
