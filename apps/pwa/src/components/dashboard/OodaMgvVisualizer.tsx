'use client';

import React from 'react';
import OODADiagnosticVisualizer, {
  OodaStageId,
  OodaStageInfo,
  DiagnosticEvent,
  OodaStateTransition,
  OODADiagnosticVisualizerProps,
} from './OODADiagnosticVisualizer';

export type {
  OodaStageId,
  OodaStageInfo,
  DiagnosticEvent,
  OodaStateTransition,
  OODADiagnosticVisualizerProps,
};

export const OodaMgvVisualizer: React.FC<OODADiagnosticVisualizerProps> = (props) => {
  return <OODADiagnosticVisualizer {...props} />;
};

export default OodaMgvVisualizer;
