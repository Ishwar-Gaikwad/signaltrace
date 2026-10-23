import { useState, useEffect, useCallback } from 'react';
import { fetchHealth } from '../services/api.js';

/**
 * Custom React hook for monitoring backend API health
 * Handles initial check on mount, manual re-check, and offline recovery
 */
export const useHealthCheck = (pollIntervalMs = 0) => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [data, setData] = useState(null);
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [endpoint, setEndpoint] = useState(null);

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      const result = await fetchHealth(5000);
      setData(result.data);
      const healthy = result.data?.status === 'healthy' && result.data?.database?.status === 'connected';
      setStatus(healthy ? 'connected' : 'disconnected');
      if (!healthy) {
        setError(`Backend is responding, but database status is ${result.data?.database?.status || 'unknown'}.`);
      }
      setRaw(result.raw);
      setLatencyMs(result.latencyMs);
      setEndpoint(result.endpoint);
      setLastChecked(new Date());
    } catch (err) {
      setStatus('disconnected');
      setError(err.message || 'Unable to connect to SignalTrace backend server');
      setLatencyMs(null);
      setLastChecked(new Date());
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkHealth();

    if (pollIntervalMs > 0) {
      const interval = setInterval(checkHealth, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, pollIntervalMs]);

  return {
    status,
    data,
    raw,
    error,
    latencyMs,
    lastChecked,
    endpoint,
    checkHealth,
    isConnected: status === 'connected',
    isChecking: status === 'checking',
    isDisconnected: status === 'disconnected'
  };
};
