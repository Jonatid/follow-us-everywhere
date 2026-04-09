import React, { useState } from 'react';

const DEFAULT_PLATFORMS = ['Instagram', 'Facebook', 'X'];

export default function CreatePost({ onCreate, loading }) {
  const [content, setContent] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    await onCreate({ content: trimmed, platforms: DEFAULT_PLATFORMS });
    setContent('');
  };

  return (
    <section className="card stack-md">
      <h2 className="heading-lg">Create post</h2>
      <form onSubmit={handleSubmit} className="stack-sm">
        <label className="label" htmlFor="postContent">Post content</label>
        <textarea
          id="postContent"
          className="input"
          rows="5"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an update with your followers..."
        />
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish post'}
        </button>
      </form>
    </section>
  );
}
