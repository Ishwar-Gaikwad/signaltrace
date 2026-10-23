import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App.jsx';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[SignalTrace] Frontend render failed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ maxWidth: 760, margin: '12vh auto', padding: '2rem', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ marginBottom: '0.75rem' }}>SignalTrace could not render</h1>
          <p style={{ color: '#fda4af', marginBottom: '1rem' }}>{this.state.error.message || String(this.state.error)}</p>
          <p style={{ color: '#94a3b8' }}>Check the browser console and Vite terminal for the full error details.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
