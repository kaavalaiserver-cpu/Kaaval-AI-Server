import React from 'react';
import './Innovation.css';

const Innovation = () => {
  return (
    <section className="section innovation-section" id="innovation">
      <div className="innovation-glow"></div>
      <div className="container">
        <div className="innovation-content reveal text-center">
          <h2 className="innovation-hook">Why replace your cameras when you can make them <span className="text-primary">intelligent</span>?</h2>
          <p className="innovation-subtext">
            Maximize your existing infrastructure investments. No new poles. No new cabling. No unnecessary capital expenditure. Just instant, enterprise-grade enforcement intelligence deployed at the edge.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Innovation;
