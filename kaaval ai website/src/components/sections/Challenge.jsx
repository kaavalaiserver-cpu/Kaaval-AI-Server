import React from 'react';
import { Video, UserSearch, Clock, EyeOff } from 'lucide-react';
import './Challenge.css';

const Challenge = () => {
  return (
    <section className="section challenge-section section-dark" id="challenge">
      <div className="container">
        <div className="section-header reveal text-center">
          <h2>Most Cities Already Have Cameras.</h2>
          <p className="section-subtitle">They Just Aren't Intelligent.</p>
        </div>
        
        <div className="challenge-grid">
          <div className="challenge-card glass-card-dark reveal">
            <Video className="challenge-icon text-secondary" size={28} />
            <h3 className="challenge-title">Traditional CCTV</h3>
            <p className="challenge-desc">Merely records footage without understanding what it sees.</p>
          </div>
          
          <div className="challenge-card glass-card-dark reveal" style={{ transitionDelay: '0.1s' }}>
            <UserSearch className="challenge-icon text-secondary" size={28} />
            <h3 className="challenge-title">Manual Monitoring</h3>
            <p className="challenge-desc">Requires intense human manpower and constant attention.</p>
          </div>
          
          <div className="challenge-card glass-card-dark reveal" style={{ transitionDelay: '0.2s' }}>
            <Clock className="challenge-icon text-secondary" size={28} />
            <h3 className="challenge-title">Delayed Response</h3>
            <p className="challenge-desc">Incidents are typically only discovered hours after they occur.</p>
          </div>
          
          <div className="challenge-card glass-card-dark reveal" style={{ transitionDelay: '0.3s' }}>
            <EyeOff className="challenge-icon text-secondary" size={28} />
            <h3 className="challenge-title">Limited Insights</h3>
            <p className="challenge-desc">Generates raw video data instead of actionable intelligence.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Challenge;
