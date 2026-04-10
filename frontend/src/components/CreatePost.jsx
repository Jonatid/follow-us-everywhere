import React, { useState } from 'react';

export default function CreatePost({ onCreate, loading, connectedAccounts = [] }) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const uniquePlatforms = Array.from(
    new Set(
      connectedAccounts
        .map((account) => account?.platform)
        .filter(Boolean)
    )
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const handlePlatformToggle = (platform, checked) => {
    setSelectedPlatforms((prev) => {
      if (checked) {
        return prev.includes(platform) ? prev : [...prev, platform];
      }
      return prev.filter((item) => item !== platform);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || selectedPlatforms.length === 0) return;
    await onCreate({
      content: trimmed,
      platforms: selectedPlatforms,
      media: mediaFiles.map((file) => file.name),
    });
    setContent('');
    setMediaFiles([]);
    setSelectedPlatforms([]);
  };

  return (
    <section className="card stack-md">
      <h2 className="heading-lg">Create post</h2>
      <form onSubmit={handleSubmit} className="stack-sm">
        <div className="social-create-post-layout">
          <div className="stack-sm">
            <label className="label" htmlFor="postContent">Post content</label>
            <textarea
              id="postContent"
              className="input"
              rows="7"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share an update with your followers..."
            />
            <label className="label" htmlFor="postMedia">Upload media (photos/videos)</label>
            <input
              id="postMedia"
              className="input"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
            />
            {mediaFiles.length > 0 ? (
              <p className="muted-text">{mediaFiles.length} media file(s) selected.</p>
            ) : null}
          </div>
          <div className="stack-sm">
            <p className="label">Publish to connected platforms</p>
            {uniquePlatforms.length > 0 ? (
              <ul className="social-platform-checklist">
                {uniquePlatforms.map((platform) => (
                  <li key={platform}>
                    <label className="social-platform-option" htmlFor={`platform-${platform}`}>
                      <input
                        id={`platform-${platform}`}
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform)}
                        onChange={(e) => handlePlatformToggle(platform, e.target.checked)}
                      />
                      <span>{platform}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No connected platforms yet. Connect at least one account first.</p>
            )}
          </div>
        </div>
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish post'}
        </button>
      </form>
    </section>
  );
}
