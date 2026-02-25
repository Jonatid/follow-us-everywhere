import React, { useEffect, useMemo, useState } from 'react';
import heroImage from '../assets/hero-web.svg';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';
import '../styles/landing.css';

const featureCards = [
  {
    id: 'one-smart-profile',
    title: 'One Smart Profile',
    preview: 'All your links, values, and updates in one structured page.',
    bullets: [
      'Links, socials, and contact in one place',
      'Clear positioning customers can trust',
      'Update anytime without breaking your link',
    ],
  },
  {
    id: 'what-it-is',
    title: 'What It Is',
    preview:
      'A focused business profile link that helps people quickly understand what you offer.',
    bullets: [
      'One place for key links and contact channels',
      'Clear info for day-to-day purchase decisions',
      'A practical way to show steady community commitment',
    ],
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    preview: 'A simple flow for businesses and communities.',
    bullets: [
      'Businesses join for free and share who they are',
      'Optional cause badges tied to verification requests',
      'Communities choose where to spend with clarity',
    ],
  },
  {
    id: 'cause-visibility',
    title: 'Cause Visibility (Optional)',
    preview: 'Show verified community support with clarity.',
    bullets: ['Optional badge requests', 'Clear verification process', 'Transparent plain-language presentation'],
  },
  {
    id: 'built-differently',
    title: 'Built Differently',
    preview: 'A calmer, business-first approach.',
    bullets: [
      'Businesses control their own profile and updates',
      'No hype language or moral ranking',
      'Structured information for transparency',
    ],
  },
  {
    id: 'why-businesses-use-it',
    title: 'Why Businesses Use It',
    preview: 'Practical benefits that stay consistent.',
    bullets: [
      'Simple setup and updates without technical overhead',
      'Stronger visibility from one trusted link',
      'Consistent messaging across campaigns',
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
  const [openFeatureCard, setOpenFeatureCard] = useState('one-smart-profile');
  const splitCards = useMemo(() => [featureCards.slice(0, 3), featureCards.slice(3)], []);

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

      <section className="landing-card-groups" aria-label="Platform features">
        {splitCards.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="landing-feature-grid landing-reveal">
            {group.map((feature) => {
              const isOpen = openFeatureCard === feature.id;

              return (
                <article key={feature.id} className={`landing-feature-card${isOpen ? ' landing-feature-card--open' : ''}`}>
                  <h2 className="heading-md">{feature.title}</h2>
                  <p className="subtitle">{feature.preview}</p>
                  <button
                    type="button"
                    className="landing-feature-card__toggle"
                    onClick={() => setOpenFeatureCard(isOpen ? null : feature.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Less info' : 'More info'}
                  </button>
                  <div className={`landing-feature-card__details${isOpen ? ' landing-feature-card__details--open' : ''}`}>
                    <ul>
                      {feature.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
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
