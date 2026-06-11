import React from 'react';
import { Shield } from 'lucide-react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer-container">
      <div className="footer-brand">
        <a href="/" className="footer-logo">
          <Shield size={20} className="footer-logo-icon" />
          <span>KAAVAL AI</span>
        </a>
        <p className="footer-tagline">
          Transforming existing infrastructure into intelligent enforcement networks.
        </p>
        <div className="footer-contact">
          <a href="mailto:hello@kaaval.ai">hello@kaaval.ai</a>
        </div>
      </div>
      
      <div className="footer-links-group">
        <h4 className="footer-group-title">Solutions</h4>
        <ul>
          <li><a href="#upgrade">Upgrade Path</a></li>
          <li><a href="#difference">Capabilities</a></li>
          <li><a href="#use-cases">Use Cases</a></li>
          <li><a href="#showcase">Platform</a></li>
        </ul>
      </div>

      <div className="footer-links-group">
        <h4 className="footer-group-title">Company</h4>
        <ul>
          <li><a href="#">About Us</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>
      
      <div className="footer-links-group">
        <h4 className="footer-group-title">Legal</h4>
        <ul>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-bottom">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Kaaval AI. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
