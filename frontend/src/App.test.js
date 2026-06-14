import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: { request: { use: jest.fn() } },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockApi),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.pushState({}, '', '/');
  mockApi.get.mockImplementation((url) => {
    if (url === '/customers/auth/me') return Promise.reject({ response: { status: 401 } });
    if (url === '/public/businesses') return Promise.resolve({ data: { businesses: [{ id: 1, name: 'Acme Cafe', slug: 'acme', tagline: 'Coffee', socials: [] }] } });
    if (url.includes('/public/businesses/by-slug/') || url.includes('/public/businesses/slug/')) return Promise.resolve({ data: { business: { id: 1, name: 'Acme Cafe', slug: 'acme', socials: [] } } });
    if (url === '/admin/dashboard/summary') return Promise.resolve({ data: { businesses: { total: 1, active: 1, inactive: 0 }, admins: 1, pendingDocuments: 0 } });
    if (url === '/admin/businesses') return Promise.resolve({ data: { businesses: [{ id: 1, name: 'Acme Cafe', email: 'a@example.com', verificationStatus: 'active' }], total: 1, limit: 25, offset: 0, hasMore: false } });
    if (url === '/admin/documents') return Promise.resolve({ data: { documents: [], total: 0, limit: 25, offset: 0, hasMore: false } });
    if (url === '/admin/badge-requests') return Promise.resolve({ data: { badgeRequests: [], total: 0, limit: 25, offset: 0, hasMore: false } });
    return Promise.resolve({ data: {} });
  });
  mockApi.post.mockResolvedValue({ data: { message: 'Support request sent successfully' } });
});

test('renders landing page heading', () => {
  render(<App />);
  expect(screen.getByText(/Follow Us Everywhere/i)).toBeInTheDocument();
});

test('auth smoke test renders customer login route', () => {
  window.history.pushState({}, '', '/customer/login');
  render(<App />);
  expect(screen.getByRole('heading', { name: /supporter login/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('admin lists smoke test loads dashboard and business list', async () => {
  localStorage.setItem('adminToken', 'admin-token');
  window.history.pushState({}, '', '/admin');
  render(<App />);
  expect(await screen.findByText(/Admin Dashboard/i)).toBeInTheDocument();
  await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/admin/businesses'));
  expect(await screen.findByText('Acme Cafe')).toBeInTheDocument();
});

test('public profile smoke test loads a business by slug', async () => {
  window.history.pushState({}, '', '/b/acme');
  render(<App />);
  expect(await screen.findByText('Acme Cafe')).toBeInTheDocument();
  expect(mockApi.get).toHaveBeenCalledWith('/public/businesses/by-slug/acme');
});

test('support form smoke test submits required fields', async () => {
  window.history.pushState({}, '', '/support');
  render(<App />);
  await userEvent.type(screen.getByLabelText(/name/i), 'Ava');
  await userEvent.type(screen.getByLabelText(/^email$/i), 'ava@example.com');
  await userEvent.type(screen.getByLabelText(/business name or slug/i), 'acme');
  await userEvent.type(screen.getByLabelText(/reason/i), 'Upload help');
  await userEvent.type(screen.getByLabelText(/message/i), 'Please help with uploads.');
  await userEvent.click(screen.getByRole('button', { name: /send support request/i }));
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/support/contact', expect.objectContaining({ email: 'ava@example.com', business: 'acme' })));
  expect(await screen.findByText(/Support request sent successfully/i)).toBeInTheDocument();
});
