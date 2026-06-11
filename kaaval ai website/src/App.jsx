import React, { useEffect } from 'react';
import Lenis from 'lenis';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

import Hero from './components/sections/Hero';
import Upgrade from './components/sections/Upgrade';
import Difference from './components/sections/Difference';
import UseCases from './components/sections/UseCases';
import Showcase from './components/sections/Showcase';
import Impact from './components/sections/Impact';
import CTA from './components/sections/CTA';

function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="section-glow-divider" />
        <Upgrade />
        <div className="section-glow-divider" />
        <Difference />
        <div className="section-glow-divider" />
        <UseCases />
        <div className="section-glow-divider" />
        <Showcase />
        <div className="section-glow-divider" />
        <Impact />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

export default App;
