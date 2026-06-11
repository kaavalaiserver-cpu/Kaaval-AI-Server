import React from 'react';
import { motion } from 'framer-motion';
import { Car, ScanLine, AlertTriangle, Activity } from 'lucide-react';
import './Difference.css';

const cards = [
  { icon: Car, title: 'Vehicle Recognition', desc: 'Identify and classify vehicles in real time from any connected camera.' },
  { icon: ScanLine, title: 'Number Plate Recognition', desc: 'Search and locate any vehicle instantly across the entire camera network.' },
  { icon: AlertTriangle, title: 'Violation Detection', desc: 'Automatically detect, flag, and document traffic violations with evidence.' },
  { icon: Activity, title: 'Real-Time Monitoring', desc: 'Continuous operational visibility across every deployment, 24/7.' },
];

const Difference = () => (
  <section className="diff" id="difference">
    <div className="container">
      <motion.h2
        className="diff-title"
        initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        The Kaaval Difference
      </motion.h2>

      <div className="diff-grid">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={i}
              className="diff-card glass"
              initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="diff-icon">
                <Icon size={28} strokeWidth={1.5} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default Difference;
