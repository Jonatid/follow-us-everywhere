import React, { useState } from 'react';

export default function ConnectAccounts({ onConnect, loading }) {
  const [platform, setPlatform] = useState('Instagram');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onConnect(platform);
  };

  return (
    <section className="card stack-md">
      <h2 className="heading-lg">Connect social accounts</h2>
      <form onSubmit={handleSubmit} className="stack-sm">
        <label className="label" htmlFor="platform">Platform</label>
        <select id="platform" className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option>Instagram</option>
          <option>Facebook</option>
          <option>X</option>
          <option>TikTok</option>
          <option>LinkedIn</option>
          <option>YouTube</option>
        </select>

        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Redirecting to OAuth...' : 'Connect account'}
        </button>
      </form>
    </section>
  );
}
