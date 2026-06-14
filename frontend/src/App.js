import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import BusinessQrPage from './pages/business/BusinessQrPage';
import SocialHub from './pages/SocialHub';
import RoleChooserModal from './components/RoleChooserModal';
import { api, customerApi, normalizePublicBusinessKey } from './services/appApi';
import { LandingPage } from './pages/MarketingPages';
import { AboutPage, FAQPage } from './pages/MarketingInfoPages';
import {
  BusinessSignup,
  BusinessLogin,
  CustomerSignup,
  CustomerLogin,
  CustomerForgotPassword,
  CustomerResetPassword,
} from './pages/AuthPages';
import { DiscoverPage, FavoritesPage, CustomerProfilePage } from './pages/CustomerPages';
import {
  BusinessForgotPassword,
  BusinessResetPassword,
  BusinessDashboard,
  PublicFollowPage,
  BusinessProfilePage,
  ContactSupport,
} from './pages/BusinessPages';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('marketing-landing');
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [publicSlug, setPublicSlug] = useState(null);
  const [contactPrefill, setContactPrefill] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [customerResetToken, setCustomerResetToken] = useState(null);
  const [customerLoginMessage, setCustomerLoginMessage] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [roleModalMode, setRoleModalMode] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const hasCustomerToken = () => Boolean(localStorage.getItem('customer_token'));
  const isBusinessAuthPath = (pathname) =>
    pathname === '/business/login' || pathname === '/business/signup';
  const isCustomerOrPublicPath = (pathname) =>
    pathname === '/customer' ||
    pathname.startsWith('/customer/') ||
    pathname === '/discover' ||
    pathname === '/favorites' ||
    ((pathname.startsWith('/business/') && pathname !== '/business/profile' && !isBusinessAuthPath(pathname)) || pathname.startsWith('/b/'));

  const isBusinessPath = (pathname) =>
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/');

  const getScreenFromPath = (pathname) => {
    if (pathname === '/') return 'marketing-landing';
    if (pathname === '/about') return 'about';
    if (pathname === '/faq') return 'faq';
    if (pathname === '/business') return 'dashboard';
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/business/login') return 'login';
    if (pathname === '/business/signup') return 'signup';
    if (pathname === '/business/profile') return 'business-profile';
    if (pathname === '/business/qr') return 'business-qr';
    if (pathname === '/business/nfc') return 'nfc-devices';
    if (pathname === '/business/social-hub') return 'social-hub';
    if (pathname === '/dashboard/social') return 'social-hub';
    if (pathname === '/reset-password') return 'reset';
    if (pathname === '/customer' || pathname === '/customer/login') return 'customer-login';
    if (pathname === '/customer/signup') return 'customer-signup';
    if (pathname === '/customer/forgot-password') return 'customer-forgot';
    if (pathname === '/customer/reset-password') return 'customer-reset';
    if (pathname === '/discover') return 'discover';
    if (pathname === '/favorites') return 'favorites';
    if (pathname === '/customer/profile') return 'customer-profile';
    if (pathname.startsWith('/b/')) return 'public';
    if (pathname.startsWith('/business/') && !isBusinessAuthPath(pathname) && pathname !== '/business/profile') return 'public';
    return null;
  };

  const syncScreenWithPath = (path) => {
    const parsedUrl = new URL(path, window.location.origin);
    const { pathname, search } = parsedUrl;
    const mappedScreen = getScreenFromPath(pathname);

    if (pathname === '/customer') {
      window.history.replaceState({}, '', '/customer/login');
      setCurrentScreen('customer-login');
      return 'customer-login';
    }

    if (pathname === '/reset-password') {
      const params = new URLSearchParams(search);
      setResetToken(params.get('token'));
    }

    if (pathname === '/customer/reset-password') {
      const params = new URLSearchParams(search);
      setCustomerResetToken(params.get('token'));
    }

    if (pathname.startsWith('/b/')) {
      const slug = normalizePublicBusinessKey(pathname.replace('/b/', ''));
      if (slug) {
        setPublicSlug(slug);
      }
    }

    if (pathname.startsWith('/business/') && pathname !== '/business/profile' && !isBusinessAuthPath(pathname)) {
      const slug = normalizePublicBusinessKey(pathname.replace('/business/', ''));
      if (slug) {
        setPublicSlug(slug);
      }
    }

    if (mappedScreen) {
      setCurrentScreen(mappedScreen);
    }

    return mappedScreen;
  };

  useEffect(() => {
    const { pathname, search } = window.location;

    const mappedScreen = syncScreenWithPath(`${pathname}${search}`);

    const token = localStorage.getItem('token');
    if (token && isBusinessPath(pathname) && !isCustomerOrPublicPath(pathname)) {
      fetchCurrentBusiness(mappedScreen);
    }

    if (hasCustomerToken()) {
      fetchCurrentCustomer();
    }

    const handlePopState = () => {
      syncScreenWithPath(`${window.location.pathname}${window.location.search}`);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const fetchCurrentBusiness = async (targetScreen = null) => {
    try {
      const response = await api.get('/auth/me');
      setCurrentBusiness(response.data);
      const businessScreens = new Set(['dashboard', 'business-profile', 'business-qr', 'social-hub', 'nfc-devices']);
      const pathnameScreen = getScreenFromPath(window.location.pathname);
      const resolvedScreen = businessScreens.has(targetScreen)
        ? targetScreen
        : (businessScreens.has(pathnameScreen) ? pathnameScreen : 'dashboard');
      setCurrentScreen(resolvedScreen);
    } catch (err) {
      localStorage.removeItem('token');
    }
  };

  const fetchCurrentCustomer = async () => {
    try {
      const response = await customerApi.get('/customers/auth/me');
      setCurrentCustomer(response.data);
    } catch (err) {
      localStorage.removeItem('customer_token');
      setCurrentCustomer(null);
    }
  };

  const handleNavigate = (screen, data = null, path = null) => {
    if (path) {
      const parsedPath = new URL(path, window.location.origin);
      const pathname = parsedPath.pathname;
      window.history.pushState({}, '', path);
      setCurrentScreen(getScreenFromPath(pathname) || screen);

      if (pathname.startsWith('/b/')) {
        const slugFromPath = normalizePublicBusinessKey(pathname.replace('/b/', ''));
        if (slugFromPath) {
          setPublicSlug(slugFromPath);
        }
      }

      if (pathname.startsWith('/business/') && pathname !== '/business/profile' && !isBusinessAuthPath(pathname)) {
        const slugFromPath = normalizePublicBusinessKey(pathname.replace('/business/', ''));
        if (slugFromPath) {
          setPublicSlug(slugFromPath);
        }
      }
    } else {
      setCurrentScreen(screen);
    }
    if (screen === 'public') {
      setPublicSlug(data);
    }
    if (screen === 'contact') {
      setContactPrefill(data);
    } else {
      setContactPrefill(null);
    }
  };

  const handleCustomerNavigate = (screen, data = null) => {
    if (screen === 'customer-login') {
      return handleNavigate(screen, null, '/customer/login');
    }
    if (screen === 'customer-signup') {
      return handleNavigate(screen, null, '/customer/signup');
    }
    if (screen === 'customer-forgot') {
      return handleNavigate(screen, null, '/customer/forgot-password');
    }
    if (screen === 'customer-reset') {
      return handleNavigate(screen, null, `/customer/reset-password${data ? `?token=${data}` : ''}`);
    }
    if (screen === 'discover') {
      return handleNavigate(screen, null, '/discover');
    }
    if (screen === 'favorites') {
      return handleNavigate(screen, null, '/favorites');
    }
    if (screen === 'customer-profile') {
      return handleNavigate(screen, null, '/customer/profile');
    }
    if (screen === 'public-route') {
      const normalizedKey = normalizePublicBusinessKey(data);
      return handleNavigate('public', normalizedKey, `/b/${encodeURIComponent(normalizedKey)}`);
    }
    return handleNavigate('marketing-landing', null, '/');
  };

  const handleLoginSuccess = (business) => {
    setCurrentBusiness(business);
    const businessScreens = new Set(['dashboard', 'business-profile', 'business-qr', 'social-hub', 'nfc-devices']);
    const pathnameScreen = getScreenFromPath(window.location.pathname);
    setCurrentScreen(businessScreens.has(pathnameScreen) ? pathnameScreen : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Business logout request failed:', err);
    } finally {
      localStorage.removeItem('token');
      setCurrentBusiness(null);
      setCurrentScreen('marketing-landing');
      window.history.pushState({}, '', '/');
    }
  };

  const handleCustomerLogout = async () => {
    try {
      await customerApi.post('/customers/auth/logout');
    } catch (err) {
      console.error('Customer logout request failed:', err);
    } finally {
      localStorage.removeItem('customer_token');
      setCurrentCustomer(null);
      setCurrentScreen('customer-login');
      window.history.pushState({}, '', '/customer/login');
    }
  };

  const handleCustomerAuthSuccess = (customer) => {
    setCustomerLoginMessage('');
    setCurrentCustomer(customer);
  };

  const handleRoleModalChoose = (screen) => {
    setRoleModalMode(null);
    if (screen === 'customer-login') {
      handleNavigate(screen, null, '/customer/login');
      return;
    }
    if (screen === 'customer-signup') {
      handleNavigate(screen, null, '/customer/signup');
      return;
    }
    if (screen === 'login') {
      handleNavigate(screen, null, '/business/login');
      return;
    }
    if (screen === 'signup') {
      handleNavigate(screen, null, '/business/signup');
    }
  };

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'marketing-landing':
        return <Landing onNavigate={handleNavigate} onOpenRoleModal={setRoleModalMode} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'faq':
        return <FAQPage onNavigate={handleNavigate} />;
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'signup':
        return <BusinessSignup onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'login':
        return <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      case 'customer-login':
        return <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} initialMessage={customerLoginMessage} />;
      case 'customer-signup':
        return <CustomerSignup onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />;
      case 'customer-forgot':
        return <CustomerForgotPassword onNavigate={handleCustomerNavigate} />;
      case 'customer-reset':
        return (
          <CustomerResetPassword
            onNavigate={handleCustomerNavigate}
            token={customerResetToken}
            onResetSuccess={(message) => {
              setCustomerLoginMessage(message);
              handleCustomerNavigate('customer-login');
            }}
          />
        );
      case 'discover':
        return <DiscoverPage onNavigate={handleCustomerNavigate} onLogout={handleCustomerLogout} customer={currentCustomer} />;
      case 'favorites':
        return hasCustomerToken() ? (
          <FavoritesPage onNavigate={handleCustomerNavigate} onLogout={handleCustomerLogout} customer={currentCustomer} />
        ) : (
          <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />
        );
      case 'customer-profile':
        return hasCustomerToken() ? (
          <CustomerProfilePage
            onNavigate={handleCustomerNavigate}
            onLogout={handleCustomerLogout}
            customer={currentCustomer}
            onCustomerUpdated={setCurrentCustomer}
          />
        ) : (
          <CustomerLogin onNavigate={handleCustomerNavigate} onAuthSuccess={handleCustomerAuthSuccess} />
        );
      case 'forgot':
        return <BusinessForgotPassword onNavigate={handleNavigate} />;
      case 'reset':
        return <BusinessResetPassword onNavigate={handleNavigate} token={resetToken} />;
      case 'dashboard':
        return currentBusiness ? (
          <BusinessDashboard
            business={currentBusiness}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onRefresh={fetchCurrentBusiness}
          />
        ) : (
          <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />
        );
      case 'business-profile':
        return currentBusiness ? (
          <BusinessProfilePage
            business={currentBusiness}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onBusinessUpdated={setCurrentBusiness}
          />
        ) : (
          <LandingPage onNavigate={handleNavigate} />
        );
      case 'business-qr':
        return <BusinessQrPage />;
      case 'nfc-devices':
        return currentBusiness ? (
          <NfcDevicesPage
            business={currentBusiness}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        ) : (
          <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />
        );
      case 'social-hub':
        return currentBusiness ? (
          <SocialHub
            businessName={currentBusiness.name}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        ) : (
          <BusinessLogin onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />
        );
      case 'public':
        return <PublicFollowPage slug={publicSlug} onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactSupport onNavigate={handleNavigate} prefill={contactPrefill} />;
      default:
        return <Landing onNavigate={handleNavigate} onOpenRoleModal={setRoleModalMode} />;
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <button type="button" className="link-button site-header__logo" onClick={() => { handleNavigate('marketing-landing', null, '/'); closeMobileNav(); }}>
            Follow Us Everywhere
          </button>
          <button
            type="button"
            className="button button-secondary button-sm site-header__menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
          >
            ☰
          </button>
          <nav className={`site-header__nav${isMobileNavOpen ? ' site-header__nav--open' : ''}`}>
            <button type="button" className="link-button" onClick={() => { handleNavigate('about', null, '/about'); closeMobileNav(); }}>The Platform</button>
            <button type="button" className="link-button" onClick={() => { handleNavigate('faq', null, '/faq'); closeMobileNav(); }}>FAQ</button>
            <button type="button" className="link-button" onClick={() => { handleNavigate('discover', null, '/discover'); closeMobileNav(); }}>Explore businesses</button>
            <button type="button" className="link-button" onClick={() => { setRoleModalMode('login'); closeMobileNav(); }}>Log in</button>
            <button type="button" className="button button-primary button-sm" onClick={() => { setRoleModalMode('signup'); closeMobileNav(); }}>Sign up free</button>
          </nav>
        </div>
      </header>

      <div className="app-shell__content">{renderScreen()}</div>

      <footer className="site-footer" aria-label="Site footer">
        <div className="site-footer__inner">
          <div className="site-footer__column">
            <h3 className="site-footer__heading">Follow Us Everywhere</h3>
            <p className="site-footer__text">One Smart Business Link For Links, Socials, And Customer Connection</p>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Platform</h4>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('about', null, '/about')}>About</button>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('faq', null, '/faq')}>FAQ</button>
            <button type="button" className="site-footer__link" onClick={() => handleNavigate('discover', null, '/discover')}>Explore businesses</button>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Account</h4>
            <button type="button" className="site-footer__link" onClick={() => setRoleModalMode('signup')}>Sign up free</button>
            <button type="button" className="site-footer__link" onClick={() => setRoleModalMode('login')}>Log in</button>
          </div>
          <div className="site-footer__column">
            <h4 className="site-footer__heading">Legal</h4>
            <span className="site-footer__text">Privacy (coming soon)</span>
            <span className="site-footer__text">Terms (coming soon)</span>
          </div>
        </div>
      </footer>

      {roleModalMode ? (
        <RoleChooserModal
          mode={roleModalMode}
          onClose={() => setRoleModalMode(null)}
          onChoose={handleRoleModalChoose}
        />
      ) : null}
    </div>
  );
}
