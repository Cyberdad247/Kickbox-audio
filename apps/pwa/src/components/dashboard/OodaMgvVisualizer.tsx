'use client';

import type React from 'react';
import OODADiagnosticVisualizer, {
  type OodaStageId,
  type OodaStageInfo,
  type DiagnosticEvent,
  type OodaStateTransition,
  type OODADiagnosticVisualizerProps,
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
