import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExternalLinkConfirmModal, { normalizeExternalUrl } from './ExternalLinkConfirmModal';

describe('ExternalLinkConfirmModal', () => {
  test('normalizes valid website URLs', () => {
    expect(normalizeExternalUrl('example.com')).toBe('https://example.com/');
    expect(normalizeExternalUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(normalizeExternalUrl('javascript:alert(1)')).toBe('');
  });

  test('warns before opening the external website in a new tab', () => {
    const onClose = jest.fn();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => ({ opener: window }));

    render(
      <ExternalLinkConfirmModal
        open
        url="https://example.com"
        destinationName="Example Business"
        onClose={onClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Example Business/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue to website/i }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/',
      '_blank',
      'noopener,noreferrer'
    );
    expect(onClose).toHaveBeenCalled();

    openSpy.mockRestore();
  });

  test('stay here closes the modal without opening a new tab', () => {
    const onClose = jest.fn();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ExternalLinkConfirmModal
        open
        url="https://example.com"
        destinationName="Example Business"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /stay here/i }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
