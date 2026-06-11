import React from 'react';
import { Shield, Building2, Map, Car, Bus, GraduationCap, Factory } from 'lucide-react';
import './WhoWeServe.css';

const entities = [
  { name: 'Police Departments', icon: Shield },
  { name: 'Smart Cities', icon: Map },
  { name: 'Municipal Corporations', icon: Building2 },
  { name: 'Highway Authorities', icon: Car },
  { name: 'Transport Departments', icon: Bus },
  { name: 'Educational Institutions', icon: GraduationCap },
  { name: 'Industrial Campuses', icon: Factory },
];

const WhoWeServe = () => {
  return (
    <section className="section serve-section" id="serve">
      <div className="container">
        <h2 className="serve-title reveal text-center">Built For</h2>
        
        <div className="serve-grid">
          {entities.map((entity, index) => {
            const Icon = entity.icon;
            return (
              <div 
                key={index} 
                className="serve-card reveal" 
                style={{ transitionDelay: `${index * 0.05}s` }}
              >
                <Icon size={24} className="serve-icon text-secondary" strokeWidth={1.5} />
                <span className="serve-name">{entity.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;
