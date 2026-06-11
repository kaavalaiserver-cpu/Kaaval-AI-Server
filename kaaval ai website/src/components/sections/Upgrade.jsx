import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import './Upgrade.css';

const Upgrade = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  // Framer motion variants for sequential reveal
  const staggerContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="upgrade" id="upgrade" ref={ref}>
      <div className="upgrade-glow" />
      <motion.div className="container upgrade-inner" style={{ opacity }}>
        <motion.h2
          className="upgrade-hook"
          initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Why replace your cameras<br />
          when you can make them <span className="upgrade-accent">intelligent</span>?
        </motion.h2>

        {/* Equation 1 */}
        <motion.div 
          className="equation-row"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.8 }}
        >
          <motion.span className="eq-step step-source" variants={item}>Normal CCTV</motion.span>
          <motion.span className="eq-step step-op" variants={item}>+</motion.span>
          
          {/* KED Block with image */}
          <motion.div className="eq-step step-ked-block" variants={item}>
            <div className="ked-image-placeholder">
              <span>Image Placeholder</span>
            </div>
            <div className="ked-text">
              <span className="step-ked">KED</span>
              <span className="step-ked-sub">Kaaval Edge Device</span>
            </div>
          </motion.div>

          <motion.span className="eq-step step-op" variants={item}>=</motion.span>
          <motion.span className="eq-step step-result" variants={item}>Smart Camera</motion.span>
        </motion.div>

        {/* Equation 2 */}
        <motion.div 
          className="equation-row"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.8 }}
          style={{ marginTop: '2rem' }}
        >
          <motion.span className="eq-step step-source" variants={item}>ANPR Camera</motion.span>
          <motion.span className="eq-step step-op" variants={item}>+</motion.span>
          
          {/* KED Block with image */}
          <motion.div className="eq-step step-ked-block" variants={item}>
            <div className="ked-image-placeholder">
              <span>Image Placeholder</span>
            </div>
            <div className="ked-text">
              <span className="step-ked">KED</span>
              <span className="step-ked-sub">Kaaval Edge Device</span>
            </div>
          </motion.div>

          <motion.span className="eq-step step-op" variants={item}>=</motion.span>
          <motion.span className="eq-step step-result-adv" variants={item}>Advanced Smart Camera</motion.span>
        </motion.div>

      </motion.div>
    </section>
  );
};

export default Upgrade;
