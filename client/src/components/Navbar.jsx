import React from 'react';
import { ShieldAlert, Award } from 'lucide-react';
import HealthIndicator from './HealthIndicator';

/**
 * Navbar Component
 * Displays application branding, HACKNOVA'26 finalist badge, and live API health indicator
 */
export const Navbar = ({ healthState }) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-wrapper">
          <div className="brand-icon-box">
            <ShieldAlert size={24} />
          </div>
          <div className="brand-text-col">
            <span className="brand-title">SignalTrace</span>
            <span className="brand-subtitle">When information matters, follow the evidence.</span>
          </div>
        </div>

        <div className="nav-actions">
          <div className="hackathon-badge">
            <Award size={14} className="text-amber-400" />
            <span>HACKNOVA'26</span>
          </div>

          <HealthIndicator
            status={healthState.status}
            latencyMs={healthState.latencyMs}
            error={healthState.error}
            isChecking={healthState.isChecking}
            onRefresh={healthState.checkHealth}
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
