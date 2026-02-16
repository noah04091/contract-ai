import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BuilderErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ContractBuilder] Render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{ fontSize: '48px' }}>⚠</div>
          <h3 style={{ margin: 0, color: '#374151', fontSize: '18px' }}>
            Ein Darstellungsfehler ist aufgetreten
          </h3>
          <p style={{ margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
            Ein unerwarteter Fehler verhindert die Anzeige dieses Bereichs.
            Ihre Daten sind gespeichert.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
