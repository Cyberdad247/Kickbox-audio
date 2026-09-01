'use client';

import React from 'react';
import { CamelotSwordAndStoneBootScreen } from './CamelotSwordAndStoneBootScreen';

export interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  return <CamelotSwordAndStoneBootScreen onComplete={onComplete} isInitialBoot={true} />;
}
