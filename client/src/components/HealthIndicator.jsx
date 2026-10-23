import React from 'react';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

/**
 * HealthIndicator Component
 * A compact, non-intrusive status pill indicating live backend API connectivity.
 */
export const HealthIndicator = ({
  status,
  latencyMs,
  error,
  isChecking,
  onRefresh
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return latencyMs !== null ? `System Online (${latencyMs}ms)` : 'System Online';
      case 'disconnected':
        return 'System Offline';
      case 'checking':
      default:
        return 'Checking Status...';
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw size={12} className="animate-spin" />;
    }
    if (status === 'connected') {
      return <CheckCircle2 size={12} />;
    }
    return <AlertCircle size={12} />;
  };

  return (
    <div
      className={`health-badge ${status}`}
      onClick={onRefresh}
      title={status === 'disconnected' ? `Error: ${error} (Click to retry)` : 'Click to ping health endpoint'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onRefresh();
      }}
    >
      <span className={`status-dot ${status}`}>
        {status === 'connected' && <span className="pulse-ring" />}
      </span>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
};

export default HealthIndicator;
