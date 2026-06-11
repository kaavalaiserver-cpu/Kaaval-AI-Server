import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Building2, Car, Map, Siren } from 'lucide-react';
import './UseCases.css';

const cases = [
  { icon: Shield, title: 'Traffic Enforcement', desc: 'Automated detection and documentation of violations at key junctions.' },
  { icon: Building2, title: 'Municipal Surveillance', desc: 'City-wide monitoring with centralized management and evidence collection.' },
  { icon: Car, title: 'Highway Monitoring', desc: 'Continuous surveillance across long stretches of existing highway infrastructure.' },
  { icon: Map, title: 'Smart Cities', desc: 'Integration of legacy cameras into modern intelligent command centers.' },
  { icon: Siren, title: 'Public Safety', desc: 'Proactive safety monitoring through continuous event intelligence.' },
];

const UseCases = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${(cases.length - 2) * 25}%`]);

  return (
    <section className="uc-section" id="use-cases" ref={containerRef}>
      <div className="uc-sticky">
        <div className="container">
          <motion.h2
            className="uc-title"
            initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Designed For Real-World Operations
          </motion.h2>
        </div>

        <motion.div className="uc-track" style={{ x }}>
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="uc-card glass">
                <div className="uc-icon">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default UseCases;
