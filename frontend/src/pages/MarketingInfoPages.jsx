import React, { useState } from 'react';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';
import heroBg from '../assets/vector-network.png';
import { faqSections } from '../constants/faqItems';
import { BackLink } from '../components/BackLink';

export const MarketingLandingPage = ({ onNavigate, onOpenRoleModal }) => {
  const [openFeatureCard, setOpenFeatureCard] = useState('one-smart-profile');

  const marketingFeatureCards = [{
    id: 'one-smart-profile',
    title: 'One Smart Profile',
    preview: 'All your links, values, and updates in one structured page.',
    bullets: [
      'Links, socials, and contact in one place',
      'Clear positioning customers can trust',
      'Update anytime without breaking your link'
    ]
  }, {
    id: 'what-it-is',
    title: 'What It Is',
    preview: 'A focused business profile link that helps people quickly understand what you offer.',
    bullets: [
      'One place for key links and contact channels',
      'Clear info for day-to-day purchase decisions',
      'A practical way to show steady community commitment'
    ]
  }, {
    id: 'how-it-works',
    title: 'How It Works',
    preview: 'A simple flow for businesses and communities.',
    bullets: [
      'Businesses join for free and share who they are',
      'Optional cause badges tied to verification requests',
      'Communities choose where to spend with clarity'
    ]
  }, {
    id: 'cause-visibility',
    title: 'Cause Visibility (Optional)',
    preview: 'Show verified community support with clarity.',
    bullets: [
      'Optional badge requests',
      'Clear verification process',
      'Transparent plain-language presentation'
    ]
  }, {
    id: 'built-differently',
    title: 'Built Differently',
    preview: 'A calmer, business-first approach.',
    bullets: [
      'Businesses control their own profile and updates',
      'No hype language or moral ranking',
      'Structured information for transparency'
    ]
  }, {
    id: 'why-businesses-use-it',
    title: 'Why Businesses Use It',
    preview: 'Practical benefits that stay consistent.',
    bullets: [
      'Simple setup and updates without technical overhead',
      'Stronger visibility from one trusted link',
      'Consistent messaging across campaigns'
    ]
  }];

  return (
    <div className="page page--gradient marketing-page" style={{ minHeight: '100vh', justifyContent: 'flex-start' }}>
      <section
        className="home-hero"
        aria-label="Home hero"
      >
        <div className="home-hero__overlay">
          <div className="home-hero__content">
            <div className="home-hero__text stack-lg">
              <p className="home-hero__label">BUILT FOR BUSINESSES THAT SHOW UP.</p>
              <h1 className="heading-xxl home-hero__title">Business Presence. Simplified.</h1>
              <p className="subtitle-lg home-hero__tagline">Unified. Discoverable. Scalable.</p>
            </div>
            <div className="home-hero__actions">
              <button type="button" className="button button-primary button-lg" onClick={() => onOpenRoleModal('signup')}>
                Sign up free
              </button>
              <button type="button" className="button button-secondary button-lg" onClick={() => onNavigate('discover', null, '/discover')}>
                Explore businesses
              </button>
            </div>
            <div className="home-hero__visual" aria-hidden="true" />
          </div>
        </div>
      </section>

      <main className="marketing-main">
        <section className="home-cards-section" aria-label="Home feature cards">
          <div className="home-cards-container card card--wide" style={{ width: '100%', maxWidth: '1120px' }}>
            <div className="marketing-feature-grid" style={{ marginTop: '8px' }}>
              {marketingFeatureCards.slice(0, 3).map((feature) => {
                const isOpen = openFeatureCard === feature.id;

                return (
                  <div key={feature.id} className={`marketing-feature-card${isOpen ? ' marketing-feature-card--open' : ''}`}>
                    <h3 className="heading-md marketing-feature-card__title">{feature.title}</h3>
                    <p className="subtitle marketing-feature-card__preview">{feature.preview}</p>
                    <button
                      type="button"
                      className="marketing-feature-card__button card-toggle-link"
                      onClick={() => setOpenFeatureCard(isOpen ? null : feature.id)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? 'Less info' : 'More info'}
                    </button>
                    <div className={`marketing-feature-card__details${isOpen ? ' marketing-feature-card__details--open' : ''}`}>
                      <ul className="marketing-feature-card__list">
                        {feature.bullets.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-blue-band" aria-hidden="true">
            <div className="home-blue-band__inner" />
          </div>

          <div className="home-cards-container card card--wide" style={{ width: '100%', maxWidth: '1120px' }}>
            <div className="marketing-feature-grid" style={{ marginTop: '8px' }}>
              {marketingFeatureCards.slice(3).map((feature) => {
                const isOpen = openFeatureCard === feature.id;

                return (
                <div key={feature.id} className={`marketing-feature-card${isOpen ? ' marketing-feature-card--open' : ''}`}>
                  <h3 className="heading-md marketing-feature-card__title">{feature.title}</h3>
                  <p className="subtitle marketing-feature-card__preview">{feature.preview}</p>
                  <button
                    type="button"
                    className="marketing-feature-card__button card-toggle-link"
                    onClick={() => setOpenFeatureCard(isOpen ? null : feature.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Less info' : 'More info'}
                  </button>
                  <div className={`marketing-feature-card__details${isOpen ? ' marketing-feature-card__details--open' : ''}`}>
                    <ul className="marketing-feature-card__list">
                      {feature.bullets.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export const AboutPage = ({ onNavigate }) => (
  <div className="page page--gradient platform-page">
    <div className="platform-page__content">
      <section className="platform-hero" aria-label="The Platform mission">
        <div className="platform-hero__overlay">
          <h1 className="heading-xl platform-hero__title">The Trust Layer for Business Identity.</h1>
          <p className="subtitle platform-hero__tagline">Follow Us Everywhere is governed digital infrastructure for verified businesses.</p>
          <div className="platform-hero__actions">
            <button type="button" className="button button-primary button-lg" onClick={() => onNavigate('discover', null, '/discover')}>
              Explore Businesses
            </button>
            <button type="button" className="button button-secondary button-lg" onClick={() => onNavigate('signup')}>
              Become a Business
            </button>
          </div>
        </div>
      </section>

      <main className="platform-main">
        <section className="home-cards-section" aria-label="The Platform sections">
          <div className="home-cards-container platform-cards-group">
            <div className="platform-cards-grid">
              <section className="platform-section-card" aria-labelledby="platform-problem-title">
                <h2 id="platform-problem-title" className="heading-lg platform-section-card__title">The Problem</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">The internet made it easy to create links.</p>
                  <p className="subtitle">It did not make it easy to build trust.</p>
                </div>
                <ul className="platform-list">
                  <li>No governance</li>
                  <li>No verification</li>
                  <li>No accountability</li>
                </ul>
              </section>

              <section className="platform-section-card" aria-labelledby="platform-difference-title">
                <h2 id="platform-difference-title" className="heading-lg platform-section-card__title">The Difference</h2>
                <div className="platform-difference-grid">
                  <div className="platform-difference-grid__column">
                    <h3 className="heading-md">Personal link pages</h3>
                  </div>
                  <div className="platform-difference-grid__column">
                    <h3 className="heading-md">Verified business infrastructure</h3>
                  </div>
                </div>
                <ul className="platform-list">
                  <li>Business-only accounts</li>
                  <li>Admin-governed platform</li>
                  <li>Policy enforcement</li>
                  <li>Community verification</li>
                  <li>Built for scale</li>
                </ul>
              </section>
            </div>
          </div>

          <div className="home-blue-band" aria-hidden="true">
            <div className="home-blue-band__inner" />
          </div>

          <div className="home-cards-container platform-cards-group">
            <div className="platform-cards-grid">
              <section className="platform-section-card" aria-labelledby="platform-vision-title">
                <h2 id="platform-vision-title" className="heading-lg platform-section-card__title">The Vision</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">We are building digital infrastructure for real businesses.</p>
                  <p className="subtitle">Not profiles.</p>
                  <p className="subtitle">Not vanity pages.</p>
                  <p className="subtitle">Infrastructure.</p>
                  <p className="subtitle">Governed.</p>
                  <p className="subtitle">Scalable.</p>
                  <p className="subtitle">Designed for partnerships, programs, and economic development.</p>
                </div>
              </section>

              <section className="platform-section-card" aria-labelledby="platform-direction-title">
                <h2 id="platform-direction-title" className="heading-lg platform-section-card__title">The Long-Term Direction</h2>
                <div className="platform-rhythm-lines">
                  <p className="subtitle">Thousands of businesses.</p>
                  <p className="subtitle">Verified community impact.</p>
                  <p className="subtitle">Searchable digital identity.</p>
                  <p className="subtitle">A trust-first marketplace.</p>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
);

export const FAQPage = ({ onNavigate }) => (
  <div className="page page--gradient faq-page">
    <div className="card card--wide faq-page__card" style={{ maxWidth: '980px' }}>
      <BackLink fallbackPath="/" onFallbackNavigate={() => onNavigate('marketing-landing', null, '/')} label="← Back to home" />
      <h1 className="heading-xl faq-page__title">FAQ</h1>
      <div className="faq-page__list" aria-label="Frequently asked questions list">
        {faqSections.map((section) => (
          <section key={section.id} className="faq-page__group" aria-label={`${section.title} FAQs`}>
            <h2 className="heading-lg">{section.title}</h2>
            {section.items.map((item) => (
              <article key={item.question} className="faq-page__item">
                <h3 className="heading-md faq-page__question">{item.question}</h3>
                <p className="subtitle faq-page__answer">{item.answer}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  </div>
);

export const PrivacyPage = ({ onNavigate }) => (
  <div className="page page--gradient faq-page">
    <div className="card card--wide faq-page__card" style={{ maxWidth: '780px' }}>
      <BackLink fallbackPath="/" onFallbackNavigate={() => onNavigate('marketing-landing', null, '/')} label="← Back to home" />
      <h1 className="heading-xl faq-page__title">Privacy Policy</h1>
      <p className="admin-muted" style={{ marginBottom: 16 }}>Last updated: June 2025</p>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Information We Collect</h2>
        <p className="subtitle">We collect information you provide when registering a business account, including your business name, email address, and profile details. We also collect usage data such as QR code scan counts and page views to help you understand your audience.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>How We Use Your Information</h2>
        <p className="subtitle">Your information is used to operate and improve the Follow Us Everywhere platform, to send account-related communications, and to provide analytics about your public profile's performance. We do not sell your personal information to third parties.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Public Profile Data</h2>
        <p className="subtitle">Business profile information you choose to display — including your name, tagline, social links, and logo — is publicly accessible at your profile URL. You control what appears on your public profile through your account settings.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Data Security</h2>
        <p className="subtitle">We use industry-standard security practices including encrypted passwords, JWT-based authentication, and HTTPS to protect your account. Two-factor authentication is required for all business accounts.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Contact</h2>
        <p className="subtitle">For privacy-related questions, please use the Contact Support form in your account dashboard.</p>
      </section>
    </div>
  </div>
);

export const TermsPage = ({ onNavigate }) => (
  <div className="page page--gradient faq-page">
    <div className="card card--wide faq-page__card" style={{ maxWidth: '780px' }}>
      <BackLink fallbackPath="/" onFallbackNavigate={() => onNavigate('marketing-landing', null, '/')} label="← Back to home" />
      <h1 className="heading-xl faq-page__title">Terms of Service</h1>
      <p className="admin-muted" style={{ marginBottom: 16 }}>Last updated: June 2025</p>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Eligibility</h2>
        <p className="subtitle">Follow Us Everywhere is available to registered businesses only. By creating an account you confirm that you are authorized to represent the business you register.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Acceptable Use</h2>
        <p className="subtitle">You agree to provide accurate business information and not to misrepresent your business identity, services, or community affiliations. Accounts found to contain misleading information may be suspended or removed.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Platform Governance</h2>
        <p className="subtitle">Follow Us Everywhere reserves the right to review, approve, or remove any business profile. Badge verifications are discretionary and may be revoked if eligibility criteria are no longer met.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Intellectual Property</h2>
        <p className="subtitle">You retain ownership of the content you upload. By posting content on Follow Us Everywhere you grant us a limited license to display that content as part of your public profile.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Limitation of Liability</h2>
        <p className="subtitle">Follow Us Everywhere is provided "as is." We are not liable for indirect or consequential damages arising from your use of the platform.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 className="heading-lg" style={{ marginBottom: 8 }}>Changes to Terms</h2>
        <p className="subtitle">We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
      </section>
    </div>
  </div>
);

// =============================================================================
// BUSINESS SIGNUP
// =============================================================================
