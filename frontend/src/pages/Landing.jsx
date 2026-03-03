import React, { useEffect } from 'react';
import profileIcon from '../assets/icon-profile-link.svg';
import servicesIcon from '../assets/icon-services-list.svg';
import trustSignalsIcon from '../assets/icon-trust-badges.svg';
import createProfileIcon from '../assets/icon-create-profile.svg';
import verifyMattersIcon from '../assets/icon-verify-check.svg';
import shareLinkIcon from '../assets/icon-share-link.svg';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';
import { faqSections } from '../constants/faqItems';
import '../styles/landing.css';

const profileCards = [
  {
    id: 'one-smart-profile',
    icon: profileIcon,
    title: 'One Smart Profile',
    description: 'One link that updates in real time.',
  },
  {
    id: 'clear-services',
    icon: servicesIcon,
    title: 'Clear Services',
    description: 'Show exactly what you offer so customers know what to do next.',
  },
  {
    id: 'trust-signals',
    icon: trustSignalsIcon,
    title: 'Trust Signals',
    description: 'Verified + Impact badges that build confidence fast.',
  },
];

const howItWorksSteps = [
  {
    id: 'create-profile',
    icon: createProfileIcon,
    title: 'Create your profile',
    description: 'Add your links, services, and details.',
  },
  {
    id: 'verify-matters',
    icon: verifyMattersIcon,
    title: 'Verify what matters',
    description: 'Add badges that increase trust and visibility.',
  },
  {
    id: 'share-link',
    icon: shareLinkIcon,
    title: 'Share one link',
    description: 'Use your public page across your site, socials, and QR.',
  },
];

const badgeCards = [
  {
    icon: businessVerifiedIcon,
    title: 'Business Verified',
    copy: 'Confirm your business is real and actively maintained.',
  },
  {
    icon: impactVerifiedIcon,
    title: 'Impact Verified',
    copy: 'Highlight meaningful commitments without clutter.',
  },
  {
    icon: communityImpactIcon,
    title: 'Community Impact',
    copy: 'Help customers feel confident about who they support.',
  },
];

export default function Landing({ onNavigate, onOpenRoleModal }) {
  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll('.landing-reveal'));
    if (!revealTargets.length || !('IntersectionObserver' in window)) {
      return undefined;
    }

    revealTargets.forEach((target) => target.classList.add('landing-reveal--hidden'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('landing-reveal--hidden');
            entry.target.classList.add('landing-reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page page page--gradient">
      <section className="landing-hero landing-reveal" aria-label="Home hero section">
        <div className="landing-hero__inner">
          <div className="landing-hero__text">
            <p className="landing-hero__eyebrow">BUILT FOR BUSINESSES THAT SHOW UP.</p>
            <h1 className="heading-xxl">Business Presence. Simplified.</h1>
            <p className="subtitle-lg">Unified. Discoverable. Scalable.</p>
            <div className="landing-hero__actions">
              <button type="button" className="button button-primary button-lg" onClick={() => onOpenRoleModal?.('signup')}>
                Sign up free
              </button>
              <button
                type="button"
                className="button button-secondary button-lg"
                onClick={() => onNavigate?.('discover', null, '/discover')}
              >
                Explore businesses
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-mid-section landing-mid-section--one landing-reveal" aria-label="Everything in one profile">
        <div className="landing-mid-section__inner">
          <header className="landing-mid-section__header">
            <h2 className="heading-xl">Everything in one profile</h2>
            <p className="subtitle">One public link that keeps your business clear and current.</p>
          </header>
          <div className="landing-card-grid">
            {profileCards.map((card) => (
              <article key={card.id} className="landing-info-card">
                <img src={card.icon} alt="" width="26" height="26" />
                <h3 className="heading-md">{card.title}</h3>
                <p className="subtitle">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-mid-section landing-mid-section--two landing-reveal" aria-label="How it works">
        <div className="landing-mid-section__inner">
          <header className="landing-mid-section__header">
            <h2 className="heading-xl">How it works</h2>
            <p className="subtitle">Set it up once. Share it everywhere.</p>
          </header>
          <div className="landing-card-grid">
            {howItWorksSteps.map((step, index) => (
              <article key={step.id} className="landing-info-card">
                <span className="landing-step-pill">Step {index + 1}</span>
                <img src={step.icon} alt="" width="26" height="26" />
                <h3 className="heading-md">{step.title}</h3>
                <p className="subtitle">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-mid-section landing-mid-section--three landing-reveal" aria-label="Badges that build trust">
        <div className="landing-mid-section__inner">
          <header className="landing-mid-section__header">
            <h2 className="heading-xl">Badges that build trust</h2>
            <p className="subtitle">Verification signals customers can recognize at a glance.</p>
          </header>
          <div className="landing-card-grid">
            {badgeCards.map((badge) => (
              <article key={badge.title} className="landing-info-card">
                <img src={badge.icon} alt="" width="26" height="26" />
                <h3 className="heading-md">{badge.title}</h3>
                <p className="subtitle">{badge.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-faq-summary landing-reveal" aria-label="FAQ summary">
        <h2 className="heading-xl">All onboarding and feature details now live in FAQ</h2>
        <p className="subtitle">
          We moved account and workflow questions into one place for easier maintenance. The FAQ includes
          general, business, and customer guidance.
        </p>
        <div className="landing-faq-summary__meta">
          <strong>{faqSections.reduce((count, section) => count + section.items.length, 0)} total questions</strong>
          <button type="button" className="button button-secondary" onClick={() => onNavigate?.('faq', null, '/faq')}>
            Open full FAQ
          </button>
        </div>
      </section>

      <section className="landing-cta landing-reveal" aria-label="Call to action">
        <h2 className="heading-xl">Ready to launch your Follow Hub?</h2>
        <p className="subtitle-lg">Create your account and start sharing a single trusted link in minutes.</p>
        <div className="landing-hero__actions">
          <button type="button" className="button button-primary button-lg" onClick={() => onOpenRoleModal?.('signup')}>
            Get started
          </button>
          <button type="button" className="button button-secondary button-lg" onClick={() => onOpenRoleModal?.('login')}>
            Log in
          </button>
        </div>
        <p className="landing-deploy-marker" aria-label="deploy marker">
          deploy-marker: hero-copy-v1
        </p>
      </section>
    </div>
  );
}
