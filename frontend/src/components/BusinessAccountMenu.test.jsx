import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessAccountMenu from './BusinessAccountMenu';

describe('BusinessAccountMenu', () => {
  test('shows Dashboard, Social Hub, and Logout (not Login)', async () => {
    const user = userEvent.setup();

    render(
      <BusinessAccountMenu
        businessName="Fuse Coffee"
        onNavigate={jest.fn()}
        onLogout={jest.fn()}
        currentView="dashboard"
      />
    );

    await user.click(screen.getByRole('button', { name: /fuse coffee/i }));

    expect(screen.getByRole('menuitem', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Social Hub' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Login' })).not.toBeInTheDocument();
  });
});
