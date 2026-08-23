import React from 'react';
import { CapsuleHost } from './components/capsule/CapsuleHost';
import { KoARealmProvider } from './context/KoARealmProvider';
import { ActivityLogProvider } from './context/ActivityLogContext';
import './styles/globals.css';

export default function App() {
  return (
    <ActivityLogProvider>
      <KoARealmProvider>
        <CapsuleHost />
      </KoARealmProvider>
    </ActivityLogProvider>
  );
}
