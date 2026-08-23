import React from 'react';
import { CapsuleHost } from './components/capsule/CapsuleHost';
import { ActivityLogProvider } from './context/ActivityLogContext';
import { GmailProvider } from './context/GmailContext';
import { KoARealmProvider } from './context/KoARealmProvider';
import './styles/globals.css';

export default function App() {
  return (
    <ActivityLogProvider>
      <KoARealmProvider>
        <GmailProvider>
          <CapsuleHost />
        </GmailProvider>
      </KoARealmProvider>
    </ActivityLogProvider>
  );
}
