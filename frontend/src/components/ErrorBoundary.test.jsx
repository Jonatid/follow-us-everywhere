import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test render failure');
};

const MaybeThrow = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Retryable render failure');
  }

  return <p>Recovered content</p>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Healthy content</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy content')).toBeInTheDocument();
  });

  test('catches render errors and reports them', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('We hit an unexpected display issue.');
    expect(screen.getByText(/Test render failure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected frontend render error:',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  test('can retry rendering after a captured error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow shouldThrow />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary>
        <MaybeThrow shouldThrow={false} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  test('supports a custom fallback renderer for reusable boundaries', () => {
    render(
      <ErrorBoundary
        fallback={({ error, retry }) => (
          <div role="alert">
            <p>Custom fallback: {error.message}</p>
            <button type="button" onClick={retry}>
              Retry custom boundary
            </button>
          </div>
        )}
      >
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Custom fallback: Test render failure');
    expect(screen.getByRole('button', { name: /retry custom boundary/i })).toBeInTheDocument();
  });
});
