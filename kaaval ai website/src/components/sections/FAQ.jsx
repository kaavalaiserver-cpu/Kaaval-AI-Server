import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQ.css';

const faqs = [
  { q: 'Can Kaaval AI work with existing CCTV cameras?', a: 'Yes. Existing cameras can be upgraded into intelligent monitoring systems without any replacement.' },
  { q: 'Do we need to replace our cameras?', a: 'No. Kaaval AI is specifically designed to augment and upgrade existing camera infrastructure.' },
  { q: 'Can it work with ANPR cameras?', a: 'Yes. ANPR cameras can be integrated to provide enhanced number plate recognition and enforcement capabilities.' },
  { q: 'Is it scalable?', a: 'Yes. Kaaval AI scales from a single-site pilot deployment to a city-wide enforcement network without changing platforms.' },
  { q: 'Can it be deployed across multiple locations?', a: 'Yes. Our centralized dashboard is built to manage monitoring and intelligence across many locations simultaneously.' },
  { q: 'Does it support centralized monitoring?', a: 'Yes. All cameras and locations feed into a single, unified command dashboard accessible to authorized personnel.' },
];

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={20} className="faq-chevron" />
      </button>
      <div className="faq-answer">
        <p>{a}</p>
      </div>
    </div>
  );
};

const FAQ = () => (
  <section className="section faq-section" id="faq">
    <div className="container">
      <div className="section-header reveal text-center">
        <h2>Frequently Asked Questions</h2>
        <p className="section-subtitle">Everything you need to know about Kaaval AI.</p>
      </div>
      <div className="faq-list reveal">
        {faqs.map((item, i) => <FAQItem key={i} {...item} />)}
      </div>
    </div>
  </section>
);

export default FAQ;
