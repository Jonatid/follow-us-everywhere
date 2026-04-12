import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ConnectAccounts from '../components/ConnectAccounts';
import CreatePost from '../components/CreatePost';
import PostHistory from '../components/PostHistory';
import BusinessAccountMenu from '../components/BusinessAccountMenu';

const configuredApiBaseUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

const DEFAULT_API_BASE_URL = 'https://followuseverywhere-api.onrender.com/api';

const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : DEFAULT_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function SocialHub({ businessName = 'Business', onNavigate, onLogout }) {
  const [posts, setPosts] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
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

  const refreshConnectedAccounts = async () => {
    try {
      const response = await api.get('/social/accounts');
      setConnectedAccounts(Array.isArray(response.data?.accounts) ? response.data.accounts : []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to load connected accounts.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([refreshPosts(), refreshConnectedAccounts()]);
    };

    loadData();
  }, []);

  const handleConnect = async (payload) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/social/connect', payload);
      const newConnection = response.data?.connection;
      if (newConnection?.platform) {
        setConnectedAccounts((prev) => {
          const existing = prev.some(
            (account) =>
              account.platform?.toLowerCase() === newConnection.platform.toLowerCase() &&
              account.accountHandle?.toLowerCase() === newConnection.accountHandle?.toLowerCase()
          );
          return existing ? prev : [...prev, newConnection];
        });
      }
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
        <div className="dashboard-header">
          <h1 className="heading-xl">Social Hub</h1>
          <BusinessAccountMenu businessName={businessName} onNavigate={onNavigate} onLogout={onLogout} currentView="social-hub" />
        </div>
        <p className="subtitle">Connect accounts and publish posts with your Zernio integration.</p>
        {message ? <p className="muted-text">{message}</p> : null}
        <ConnectAccounts onConnect={handleConnect} loading={loading} />
        <CreatePost onCreate={handleCreatePost} loading={loading} connectedAccounts={connectedAccounts} />
        <PostHistory posts={posts} />
      </div>
    </div>
  );
}
