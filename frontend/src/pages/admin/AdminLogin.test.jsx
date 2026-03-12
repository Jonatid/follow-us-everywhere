import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminLogin from './AdminLogin';

jest.mock('../../utils/adminApi', () => ({
  adminLogin: jest.fn(),
}));

describe('AdminLogin reset behavior', () => {
  test('clears stale credential and 2FA state when resetSignal changes', async () => {
    const onSuccess = jest.fn();
    const { rerender } = render(<AdminLogin onSuccess={onSuccess} resetSignal={0} />);

    const emailInput = screen.getByPlaceholderText('admin@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'stale-admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'old-password' } });

    expect(emailInput.value).toBe('stale-admin@example.com');
    expect(passwordInput.value).toBe('old-password');

    rerender(<AdminLogin onSuccess={onSuccess} resetSignal={1} />);

    expect(screen.getByPlaceholderText('admin@example.com').value).toBe('');
    expect(screen.getByPlaceholderText('••••••••').value).toBe('');
    expect(screen.queryByText('Enter authentication code')).not.toBeInTheDocument();
  });
});
