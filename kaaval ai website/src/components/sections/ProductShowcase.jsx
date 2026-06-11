import React, { useState, useEffect, useRef } from 'react';
import './ProductShowcase.css';

const words = ['Monitor', 'Manage', 'Analyze', 'Act'];

const ProductShowcase = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !showUI) {
          // Start sequence
          let current = 0;
          const interval = setInterval(() => {
            current++;
            if (current >= words.length) {
              clearInterval(interval);
              setTimeout(() => setShowUI(true), 800); // Reveal UI after last word
            } else {
              setWordIndex(current);
            }
          }, 800);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [showUI]);

  return (
    <section className="section showcase-section" id="showcase" ref={sectionRef}>
      <div className="container showcase-container">
        
        {/* Animated Words Sequence */}
        <div className={`showcase-words-overlay ${showUI ? 'hidden' : ''}`}>
          {words.map((w, i) => (
            <h2 
              key={i} 
              className={`showcase-huge-word ${i === wordIndex ? 'active' : ''} ${i < wordIndex ? 'passed' : ''}`}
            >
              {w}.
            </h2>
          ))}
        </div>

        {/* Revealed Platform UI */}
        <div className={`showcase-ui-reveal ${showUI ? 'active' : ''}`}>
          <div className="section-header text-center">
            <h2>Command Dashboard</h2>
            <p className="section-subtitle">Real-time visibility across all deployments.</p>
          </div>
          
          <div className="device-mockup laptop">
            <div className="mockup-screen">
              <div className="mockup-ui">
                <div className="ui-header"></div>
                <div className="ui-body">
                  <div className="ui-sidebar"></div>
                  <div className="ui-content">
                    <div className="ui-card"></div>
                    <div className="ui-card"></div>
                    <div className="ui-card wide"></div>
                    <div className="ui-chart"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ProductShowcase;
