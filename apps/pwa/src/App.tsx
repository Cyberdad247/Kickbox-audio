import React from 'react';
import { CapsuleHost } from './components/capsule/CapsuleHost';
import { ActivityLogProvider } from './context/ActivityLogContext';
import { GmailProvider } from './context/GmailContext';
import { KoARealmProvider } from './context/KoARealmProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

export default function App() {
  return (
    <ErrorBoundary>
      <ActivityLogProvider>
        <KoARealmProvider>
          <GmailProvider>
            <CapsuleHost />
          </GmailProvider>
        </KoARealmProvider>
      </ActivityLogProvider>
    </ErrorBoundary>
  );
}
