import React from 'react';
import Navbar from './components/Navbar';
import DashboardShell from './pages/DashboardShell';
import { useHealthCheck } from './hooks/useHealthCheck';

export function App() {
  // Poll every 30 seconds, or user can trigger instantly via indicator / button
  const healthState = useHealthCheck(30000);

  return (
    <div className="app-container">
      <Navbar healthState={healthState} />
      <main>
        <DashboardShell healthState={healthState} />
      </main>
    </div>
  );
}

export default App;
