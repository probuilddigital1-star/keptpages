import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import TrustBar from '@/components/landing/TrustBar';
import TransformSection from '@/components/landing/TransformSection';
import HowItWorks from '@/components/landing/HowItWorks';
import UseCases from '@/components/landing/UseCases';
import BookPreview from '@/components/landing/BookPreview';
import Pricing from '@/components/landing/Pricing';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import StickyMobileCTA from '@/components/landing/StickyMobileCTA';

export default function Landing() {
  const navigate = useNavigate();

  // Scroll reveal via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach((el) => observer.observe(el));

    return () => {
      reveals.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const goToSignup = () => navigate('/signup');
  const goToLogin = () => navigate('/login');

  return (
    <>
      <Nav onCtaClick={goToSignup} onLoginClick={goToLogin} />

      <div data-hero>
        <Hero onCtaClick={goToSignup} onLoginClick={goToLogin} />
      </div>

      <TrustBar />
      <TransformSection />
      <HowItWorks />
      <UseCases />
      <BookPreview />
      <Pricing onCtaClick={goToSignup} />
      <FinalCTA onCtaClick={goToSignup} />
      <Footer />

      <StickyMobileCTA onCtaClick={goToSignup} onLoginClick={goToLogin} />
    </>
  );
}
