import React from 'react';

export default function PostHistory({ posts }) {
  return (
    <section className="card stack-md">
      <h2 className="heading-lg">Post history</h2>
      {posts.length === 0 ? (
        <p className="muted-text">No posts yet.</p>
      ) : (
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {posts.map((post) => (
            <li key={post.id} className="card stack-xs">
              <p className="text-strong">{post.status || 'queued'}</p>
              <p>{post.content}</p>
              <p className="muted-text">{new Date(post.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
