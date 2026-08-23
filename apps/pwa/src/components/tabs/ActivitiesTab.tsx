'use client';

import React from 'react';
import { ActivityLogDisplay } from '../capsule/ActivityLogDisplay';

export function ActivitiesTab() {
  return (
    <div className="space-y-6">
      <ActivityLogDisplay />
    </div>
  );
}
