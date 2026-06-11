import React from 'react';
import { Camera, Plug, DollarSign, Maximize2, Settings2, Zap } from 'lucide-react';
import './WhyKaaval.css';

const reasons = [
  { icon: Camera, label: 'No Camera Replacement', desc: 'Leverage your existing surveillance investments.' },
  { icon: Zap, label: 'Faster Deployment', desc: 'From agreement to live operations in days, not months.' },
  { icon: Maximize2, label: 'Scalable', desc: 'Grow from a single site to a city-wide network seamlessly.' },
  { icon: DollarSign, label: 'Cost Efficient', desc: 'Significantly lower capital expenditure than full replacements.' },
  { icon: Settings2, label: 'Centralized Management', desc: 'Unified visibility and control across all locations.' },
  { icon: Plug, label: 'Actionable Intelligence', desc: 'Move beyond raw footage to decisions that matter.' },
];

const WhyKaaval = () => (
  <section className="section why-section" id="why-kaaval">
    <div className="container">
      <div className="section-header reveal text-center">
        <h2>Why Organizations Choose Kaaval AI</h2>
        <p className="section-subtitle">The operational advantage that drives adoption.</p>
      </div>
      <div className="why-grid">
        {reasons.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className="why-card reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
              <div className="why-icon">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="why-label">{r.label}</h3>
              <p className="why-desc">{r.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhyKaaval;
