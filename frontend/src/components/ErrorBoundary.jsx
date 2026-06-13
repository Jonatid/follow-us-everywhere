import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unexpected frontend render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { children } = this.props;
    const { hasError, error } = this.state;

    if (!hasError) {
      return children;
    }

    return (
      <main className="error-boundary" role="alert">
        <section className="error-boundary__card" aria-labelledby="error-boundary-title">
          <p className="error-boundary__eyebrow">Something went wrong</p>
          <h1 id="error-boundary-title">We hit an unexpected display issue.</h1>
          <p className="error-boundary__message">
            The rest of the app is protected while we recover. You can try again or reload the page safely.
          </p>
          {error?.message ? <p className="error-boundary__detail">Error: {error.message}</p> : null}
          <div className="error-boundary__actions">
            <button type="button" className="button-primary" onClick={this.handleRetry}>
              Try again
            </button>
            <button type="button" className="button-secondary" onClick={this.handleReload}>
              Reload page
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
