import React, { useEffect } from 'react';
import heroImage from '../assets/hero-web.svg';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';
import { faqSections } from '../constants/faqItems';
import '../styles/landing.css';

const landingSections = [
  {
    id: 'everyone',
    title: 'For everyone',
    description: 'Core platform value that applies to both businesses and customers.',
    cards: [
      {
        id: 'one-smart-profile',
        title: 'One Smart Profile',
        bullets: [
          'All your links, values, and updates in one structured page',
          'Clear positioning customers can trust',
          'Update anytime without breaking your public link',
        ],
      },
      {
        id: 'what-it-is',
        title: 'What It Is',
        bullets: [
          'A focused business profile link people can understand quickly',
          'One place for links, contact channels, and context',
          'Simple and transparent experience from first visit',
        ],
      },
    ],
  },
  {
    id: 'business',
    title: 'For businesses',
    description: 'Tools that help business owners control their profile and messaging.',
    cards: [
      {
        id: 'how-it-works',
        title: 'Business setup',
        bullets: [
          'Sign up free and create your business profile',
          'Add your links, contact details, and services',
          'Share one trusted profile URL across campaigns',
        ],
      },
      {
        id: 'cause-visibility',
        title: 'Cause Visibility (Optional)',
        bullets: [
          'Optional badge requests tied to verification',
          'Clear review process before display',
          'Plain-language presentation for customers',
        ],
      },
      {
        id: 'why-businesses-use-it',
        title: 'Why Businesses Use It',
        bullets: [
          'Simple setup and updates without technical overhead',
          'Stronger visibility from one trusted link',
          'Consistent messaging across channels',
        ],
      },
    ],
  },
  {
    id: 'customer',
    title: 'For customers',
    description: 'Signals that make it easier to discover and trust local businesses.',
    cards: [
      {
        id: 'built-differently',
        title: 'Built differently',
        bullets: [
          'No hype language or moral ranking',
          'Structured information people can understand fast',
          'A calmer, trust-first discovery experience',
        ],
      },
    ],
  },
];

const badgeCards = [
  {
    icon: businessVerifiedIcon,
    title: 'Business Verified',
    copy: 'Show customers your profile is authentic and actively maintained.',
  },
  {
    icon: impactVerifiedIcon,
    title: 'Impact Verified',
    copy: 'Highlight verified causes and commitments without clutter.',
  },
  {
    icon: communityImpactIcon,
    title: 'Community Impact',
    copy: 'Give people confidence about where to shop and support.',
  },
];

export default function Landing({ onNavigate, onOpenRoleModal }) {
  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll('.landing-reveal'));
    if (!revealTargets.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
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
            <p className="landing-hero__eyebrow">Built for businesses that show up.</p>
            <h1 className="heading-xxl">One smart public profile for your business.</h1>
            <p className="subtitle-lg">
              Share your links, your services, and what matters to your business — all in one trusted place.
            </p>
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
          <div className="landing-hero__media" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        </div>
      </section>

      <section className="landing-card-groups" aria-label="Platform features by audience">
        {landingSections.map((section) => (
          <div key={section.id} className="landing-section landing-reveal">
            <header className="landing-section__header">
              <h2 className="heading-xl">{section.title}</h2>
              <p className="subtitle">{section.description}</p>
            </header>
            <div className="landing-feature-grid">
              {section.cards.map((feature) => (
                <article key={feature.id} className="landing-feature-card">
                  <h3 className="heading-md">{feature.title}</h3>
                  <ul>
                    {feature.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="landing-badges landing-reveal" aria-label="Badges overview">
        {badgeCards.map((badge) => (
          <article key={badge.title} className="landing-badge-card">
            <img src={badge.icon} alt="" width="40" height="40" />
            <h3 className="heading-md">{badge.title}</h3>
            <p className="subtitle">{badge.copy}</p>
          </article>
        ))}
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
      </section>
    </div>
  );
}
