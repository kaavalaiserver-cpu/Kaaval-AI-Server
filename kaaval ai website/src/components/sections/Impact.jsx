import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './Impact.css';

const metrics = [
  { value: 100, suffix: '%', label: 'Camera Compatibility' },
  { value: 95, suffix: '%', label: 'Infrastructure Reuse' },
  { value: 24, suffix: '/7', label: 'Monitoring' },
  { value: 1, suffix: '', label: 'Unified Platform' },
];

const Counter = ({ target, suffix, active }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setCount(target); clearInterval(id); }
      else setCount(cur);
    }, 20);
    return () => clearInterval(id);
  }, [target, active]);
  return <>{count}{suffix}</>;
};

const Impact = () => {
  const [active, setActive] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setActive(true); },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="impact" id="impact" ref={ref}>
      <div className="impact-glow" />
      <div className="container impact-inner">
        {metrics.map((m, i) => (
          <motion.div
            key={i}
            className="impact-block"
            initial={{ opacity: 0, y: 60, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="impact-num">
              <Counter target={m.value} suffix={m.suffix} active={active} />
            </span>
            <span className="impact-label">{m.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Impact;
