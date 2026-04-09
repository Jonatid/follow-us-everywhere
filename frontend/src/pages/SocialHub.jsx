import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ConnectAccounts from '../components/ConnectAccounts';
import CreatePost from '../components/CreatePost';
import PostHistory from '../components/PostHistory';

const configuredApiBaseUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function SocialHub() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refreshPosts = async () => {
    try {
      const response = await api.get('/social/posts/history');
      setPosts(Array.isArray(response.data?.posts) ? response.data.posts : []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to load post history.');
    }
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const handleConnect = async (payload) => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/social/connect', payload);
      setMessage('Account connected successfully.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to connect account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (payload) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/social/posts', payload);
      const newPost = response.data?.post;
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      } else {
        await refreshPosts();
      }
      setMessage('Post created successfully.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--gradient">
      <div className="card card--wide stack-lg">
        <h1 className="heading-xl">Social Hub</h1>
        <p className="subtitle">Connect accounts and publish posts with your Zernio integration.</p>
        {message ? <p className="muted-text">{message}</p> : null}
        <ConnectAccounts onConnect={handleConnect} loading={loading} />
        <CreatePost onCreate={handleCreatePost} loading={loading} />
        <PostHistory posts={posts} />
      </div>
    </div>
  );
}
