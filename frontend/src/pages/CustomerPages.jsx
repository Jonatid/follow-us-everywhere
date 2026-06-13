import React, { useState, useEffect, useMemo, useRef } from 'react';
import { customerApi, getApiErrorMessage, buildPublicBusinessUrl, normalizePublicBusinessPayload, resolvePublicBusinessKey } from '../services/appApi';
import { BackLink } from '../components/BackLink';
import businessVerifiedIcon from '../assets/business-verified.svg';
import impactVerifiedIcon from '../assets/impact-verified.svg';
import communityImpactIcon from '../assets/community-impact.svg';

export const CustomerNav = ({ onNavigate, onLogout, activeScreen, customer }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = customer?.first_name || customer?.email || 'Customer';

  return (
    <div className="row space-between row-wrap" style={{ gap: '8px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <div className="row row-wrap" style={{ gap: '8px' }}>
        <button
          type="button"
          className={`button button-sm ${activeScreen === 'discover' ? 'button-primary' : 'button-muted'}`}
          onClick={() => onNavigate('discover')}
        >
          Discover
        </button>
        <button
          type="button"
          className={`button button-sm ${activeScreen === 'favorites' ? 'button-primary' : 'button-muted'}`}
          onClick={() => onNavigate('favorites')}
        >
          Favorites
        </button>
      </div>

      {customer ? (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="button button-sm button-muted"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            Hello, {displayName}
          </button>
          {menuOpen && (
            <div className="card" style={{ position: 'absolute', right: 0, top: '40px', minWidth: '180px', zIndex: 20, padding: '10px' }}>
              <button type="button" className="button button-sm button-muted button-full" onClick={() => onNavigate('customer-profile')}>
                Profile
              </button>
              <button type="button" className="button button-sm button-muted button-full" onClick={onLogout} style={{ marginTop: '8px' }}>
                Logout
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const DiscoverPage = ({ onNavigate, onLogout, customer }) => {
  const [businessName, setBusinessName] = useState('');
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [communitySupport, setCommunitySupport] = useState('');
  const [badge, setBadge] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [businesses, setBusinesses] = useState([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impactModal, setImpactModal] = useState({ open: false, businessName: '', loading: false, error: '', data: null });
  const discoverRequestIdRef = useRef(0);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!localStorage.getItem('customer_token')) {
        setFavoriteIds(new Set());
        return;
      }

      try {
        const favoritesResponse = await customerApi.get('/customers/favorites');
        setFavoriteIds(new Set((favoritesResponse.data?.favorites || []).map((item) => item.id)));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load favorites.'));
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = discoverRequestIdRef.current + 1;
    discoverRequestIdRef.current = requestId;

    const loadBusinesses = async () => {
      setLoading(true);
      setError('');
      try {
        const trimmedBusinessName = businessName.trim();
        const params = {
          page: currentPage,
          limit: itemsPerPage
        };

        if (trimmedBusinessName) {
          params.query = trimmedBusinessName;
        }

        const response = await customerApi.get('/public/businesses', {
          params,
          signal: controller.signal
        });

        if (discoverRequestIdRef.current !== requestId) {
          return;
        }

        setBusinesses(response.data?.businesses || []);
        setTotalBusinesses(Number(((response.data?.totalCount ?? response.data?.total) || 0)));
      } catch (err) {
        if (controller.signal.aborted || discoverRequestIdRef.current !== requestId) {
          return;
        }
        setError(getApiErrorMessage(err, 'Unable to load discover businesses.'));
      } finally {
        if (discoverRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    loadBusinesses();

    return () => {
      controller.abort();
    };
  }, [businessName, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [businessName, communitySupport, badge, itemsPerPage]);

  const filteredBusinesses = useMemo(() => {
    const normalizedCommunitySupport = communitySupport.trim().toLowerCase();
    const normalizedBadge = badge.trim().toLowerCase();

    return businesses.filter((business) => {
      const communitySupportValue = [
        business.community_support,
        business.communitySupport,
        business.community,
        business.community_name,
        business.communityName
      ]
        .flat()
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const badgesValue = [
        business.badges,
        business.badge,
        business.badge_names,
        business.badgeNames
      ]
        .flat()
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesCommunitySupport = normalizedCommunitySupport === '' || communitySupportValue.includes(normalizedCommunitySupport);
      const matchesBadge = normalizedBadge === '' || badgesValue.includes(normalizedBadge);

      return matchesCommunitySupport && matchesBadge;
    });
  }, [businesses, communitySupport, badge]);

  const totalPages = Math.max(1, Math.ceil(totalBusinesses / itemsPerPage));


  const openImpactModal = async (business) => {
    setImpactModal({ open: true, businessName: business.name, loading: true, error: '', data: null });

    try {
      const response = await customerApi.get(`/public/businesses/${business.id}/impact`);
      setImpactModal({
        open: true,
        businessName: business.name,
        loading: false,
        error: '',
        data: response.data
      });
    } catch (err) {
      setImpactModal({
        open: true,
        businessName: business.name,
        loading: false,
        error: getApiErrorMessage(err, 'Unable to load community impact.'),
        data: null
      });
    }
  };

  const toggleFavorite = async (businessId, isFavorited) => {
    if (!localStorage.getItem('customer_token')) {
      setShowSoftGate(true);
      return;
    }

    try {
      if (isFavorited) {
        await customerApi.delete(`/customers/favorites/${businessId}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      } else {
        await customerApi.post(`/customers/favorites/${businessId}`);
        setFavoriteIds((prev) => new Set([...prev, businessId]));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update favorite.'));
    }
  };

  return (
    <div className="dashboard discover-page">
      <section className="discover-hero">
        <div className="discover-hero__inner">
          <h1 className="discover-hero__title">Discover Verified Businesses</h1>
          <p className="discover-hero__subtext">Search, filter, and connect with trusted organizations.</p>
        </div>
      </section>
      <div className="dashboard-container discover-shell">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="discover" customer={customer} />

          <div className="discover-controls card">
            <p className="subtitle" style={{ marginTop: 0, marginBottom: '8px' }}>Search by</p>
            <div className="row row-wrap" style={{ gap: '12px', alignItems: 'flex-end' }}>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <select className="input" value={communitySupport} onChange={(e) => setCommunitySupport(e.target.value)}>
                  <option value="">Community support</option>
                  <option value="Community One">Community One</option>
                  <option value="Community Two">Community Two</option>
                  <option value="Community Three">Community Three</option>
                </select>
              </div>
              <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}>
                <select className="input" value={badge} onChange={(e) => setBadge(e.target.value)}>
                  <option value="">Badges</option>
                  <option value="Badge One">Badge One</option>
                  <option value="Badge Two">Badge Two</option>
                  <option value="Badge Three">Badge Three</option>
                </select>
              </div>
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <p className="muted-text" style={{ marginTop: '16px' }}>Loading businesses...</p>
          ) : (
            <div className="stack-md">
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
                <label className="muted-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Per page
                  <select className="input" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} style={{ width: '90px' }}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </label>
              </div>
              <div className="discover-results">
                {filteredBusinesses.map((business) => {
                  const isFavorited = favoriteIds.has(business.id);
                  const statusValue = (business.status || 'active').toLowerCase();
                  const isActive = statusValue === 'active';
                  const isVerified = business.verified === true || business.verification === 'verified';
                  const hasApprovedImpactBadges = Array.isArray(business.badges) && business.badges.length > 0;
                  return (
                    <div key={business.id} className="card discover-result-card" style={{ border: '1px solid var(--border)', boxShadow: 'none', padding: '20px' }}>
                      <div className="row space-between row-wrap" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <p className="heading-md">{business.name}</p>
                          <p className="subtitle">{business.tagline || 'No tagline available.'}</p>
                          <div className="row row-wrap" style={{ marginTop: '8px', gap: '8px' }}>
                            {isActive ? <span className="badge badge--active">Active</span> : null}
                            {isVerified ? (
                              <span className="badge badge--verified">
                                <img src={businessVerifiedIcon} alt="" className="badge__icon" aria-hidden="true" />
                                Verified
                              </span>
                            ) : null}
                            {hasApprovedImpactBadges ? (
                              <span className="badge badge--verified">
                                <img src={impactVerifiedIcon} alt="" className="badge__icon" aria-hidden="true" />
                                Impact Verified
                              </span>
                            ) : null}
                          </div>
                          <p className="muted-text">Status: {business.verification_status || 'unknown'}</p>
                        </div>
                        <div className="row" style={{ gap: '8px' }}>
                          <button
                            type="button"
                            className="button button-muted button-sm"
                            onClick={() => {
                              if (!localStorage.getItem('customer_token')) {
                                setShowSoftGate(true);
                                return;
                              }
                              onNavigate('public-route', business.slug);
                            }}
                          >
                            View Profile
                          </button>
                          {hasApprovedImpactBadges ? (
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={() => openImpactModal(business)}
                            >
                              <span className="row" style={{ gap: '6px', alignItems: 'center' }}>
                                <img src={communityImpactIcon} alt="" className="badge__icon" aria-hidden="true" />
                                View Community Impact
                              </span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={`button button-sm ${isFavorited ? 'button-secondary' : 'button-primary'}`}
                            onClick={() => toggleFavorite(business.id, isFavorited)}
                          >
                            {isFavorited ? 'Unfavorite' : 'Favorite'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredBusinesses.length === 0 && <p className="muted-text">No businesses found.</p>}

              {impactModal.open ? (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
                  <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '80vh', overflow: 'auto' }}>
                    <div className="row space-between" style={{ alignItems: 'center' }}>
                      <h2 className="heading-md" style={{ margin: 0 }}>Community Impact</h2>
                      <button type="button" className="button button-muted button-sm" onClick={() => setImpactModal({ open: false, businessName: '', loading: false, error: '', data: null })}>Close</button>
                    </div>
                    <p className="subtitle" style={{ marginTop: '6px' }}>{impactModal.businessName}</p>
                    {impactModal.loading ? <p className="muted-text">Loading verified actions...</p> : null}
                    {impactModal.error ? <div className="alert alert-error">{impactModal.error}</div> : null}
                    {impactModal.data ? (
                      <div className="stack-sm" style={{ marginTop: '10px' }}>
                        <p className="text-strong">Community Impact: {impactModal.data?.verified_count || 0} Verified Actions</p>
                        {(impactModal.data?.verified_badges || []).length === 0 ? (
                          <p className="muted-text">No approved community impact badges yet.</p>
                        ) : (
                          (impactModal.data?.verified_badges || []).map((item) => (
                            <div key={item.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
                              <p className="text-strong">{item.name}</p>
                              <p className="muted-text" style={{ marginTop: '4px' }}>{item.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {totalBusinesses > 0 && (
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <p className="muted-text">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="row" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="button button-sm button-muted"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="button button-sm button-primary"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSoftGate ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="card card--medium" style={{ width: '100%', maxWidth: '460px' }}>
            <h2 className="heading-lg" style={{ marginBottom: '8px' }}>Create a free supporter account</h2>
            <p className="subtitle">View full business profiles and follow businesses you want to support.</p>
            <div className="stack-sm" style={{ marginTop: '18px' }}>
              <button type="button" className="button button-primary button-full" onClick={() => onNavigate('customer-signup')}>
                Create free account
              </button>
              <button type="button" className="button button-secondary button-full" onClick={() => onNavigate('customer-login')}>
                Log in
              </button>
              <button type="button" className="button button-muted button-full" onClick={() => setShowSoftGate(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const FavoritesPage = ({ onNavigate, onLogout, customer }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.get('/customers/favorites');
      setFavorites(response.data?.favorites || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load favorites.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (businessId) => {
    try {
      await customerApi.delete(`/customers/favorites/${businessId}`);
      setFavorites((prev) => prev.filter((item) => item.id !== businessId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to remove favorite.'));
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="favorites" customer={customer} />
          <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
          <h1 className="heading-lg">My Favorites</h1>
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <p className="muted-text" style={{ marginTop: '16px' }}>Loading favorites...</p>
          ) : (
            <div className="stack-md">
              {favorites.map((business) => (
                <div key={business.id} className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none', padding: '20px' }}>
                  <div className="row space-between row-wrap" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <p className="heading-md">{business.name}</p>
                      <p className="subtitle">{business.tagline || 'No tagline available.'}</p>
                      <p className="muted-text">Status: {business.verification_status || 'unknown'}</p>
                    </div>
                    <div className="row" style={{ gap: '8px' }}>
                      <button type="button" className="button button-muted button-sm" onClick={() => onNavigate('public-route', business.slug)}>
                        View Profile
                      </button>
                      <button type="button" className="button button-secondary button-sm" onClick={() => removeFavorite(business.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {favorites.length === 0 && <p className="muted-text">No favorites saved yet.</p>}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export const CustomerProfilePage = ({ onNavigate, onLogout, customer, onCustomerUpdated, initialMessage = '' }) => {
  const [formData, setFormData] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || ''
    });
  }, [customer]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };



  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await customerApi.put('/customers/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address
      });
      onCustomerUpdated(response.data.customer);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update profile.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="card dashboard-card">
          <CustomerNav onNavigate={onNavigate} onLogout={onLogout} activeScreen="customer-profile" customer={customer} />
          <BackLink fallbackPath="/discover" onFallbackNavigate={() => onNavigate('discover')} />
          <h1 className="heading-lg">My Profile</h1>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <div className="stack-md" style={{ marginTop: '16px' }}>
            <div className="field">
              <label className="label">First name</label>
              <input className="input" type="text" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Last name</label>
              <input className="input" type="text" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={formData.email} readOnly />
            </div>
            <div className="field">
              <label className="label">Phone</label>
              <input className="input" type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Address</label>
              <textarea className="input" rows="3" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
            </div>
            <button type="button" className="button button-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// BUSINESS FORGOT PASSWORD
// =============================================================================
