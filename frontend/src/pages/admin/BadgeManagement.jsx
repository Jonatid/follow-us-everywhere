import React, { useEffect, useState } from 'react';
import { createBadge, deleteBadge, fetchBadges, updateBadge } from '../../utils/adminApi';

const BadgeManagement = () => {
  const [badges, setBadges] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBadges = async () => {
    try {
      const data = await fetchBadges();
      setBadges(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load badges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const handleCreate = async () => {
    setError('');
    if (!name || !description) {
      setError('Name and description are required.');
      return;
    }
    setSaving(true);
    try {
      await createBadge({ name, description, icon: icon || null });
      setName('');
      setDescription('');
      setIcon('');
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create badge.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (badgeId, field, value) => {
    setBadges((prev) =>
      prev.map((badge) => (badge.id === badgeId ? { ...badge, [field]: value } : badge))
    );
  };

  const handleUpdate = async (badgeId) => {
    const badge = badges.find((item) => item.id === badgeId);
    if (!badge) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateBadge(badgeId, {
        name: badge.name,
        description: badge.description,
        icon: badge.icon || null
      });
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update badge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badgeId) => {
    setSaving(true);
    setError('');
    try {
      await deleteBadge(badgeId);
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete badge.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <h1>Community Impact Badges</h1>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      <div className="admin-form">
        <label>
          Badge name
          <input
            type="text"
            className="admin-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Neighborhood Partner"
          />
        </label>
        <label>
          Description
          <input
            type="text"
            className="admin-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Recognized for supporting local events"
          />
        </label>
        <label>
          Icon (optional)
          <input
            type="text"
            className="admin-input"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            placeholder="🌟"
          />
        </label>
        <button type="button" className="admin-button primary" onClick={handleCreate} disabled={saving}>
          {saving ? 'Saving...' : 'Create Badge'}
        </button>
      </div>
      {loading ? (
        <p className="admin-muted">Loading badges...</p>
      ) : (
        <div className="admin-badge-list">
          {badges.length === 0 ? (
            <p className="admin-muted">No badges yet. Create the first badge above.</p>
          ) : (
            badges.map((badge) => (
              <div key={badge.id} className="admin-badge-item">
                <div className="admin-badge-fields">
                  <input
                    type="text"
                    className="admin-input"
                    value={badge.name}
                    onChange={(event) => handleFieldChange(badge.id, 'name', event.target.value)}
                  />
                  <input
                    type="text"
                    className="admin-input"
                    value={badge.description}
                    onChange={(event) => handleFieldChange(badge.id, 'description', event.target.value)}
                  />
                  <input
                    type="text"
                    className="admin-input"
                    value={badge.icon || ''}
                    onChange={(event) => handleFieldChange(badge.id, 'icon', event.target.value)}
                    placeholder="Icon"
                  />
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="admin-button secondary"
                    onClick={() => handleUpdate(badge.id)}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="admin-button danger"
                    onClick={() => handleDelete(badge.id)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeManagement;
