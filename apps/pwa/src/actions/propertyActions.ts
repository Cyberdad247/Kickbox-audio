import { defineAction } from '@agent-native/core';
import { z } from 'zod';

export interface DispatchPlumberResult {
  status: string;
  timestamp: string;
  ticketId: string;
  unit: string;
  issue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const dispatchPlumberAction = defineAction({
  description: 'Dispatches a plumbing service request to a property unit.',
  schema: z.object({
    unit: z.string(),
    issue: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  }),
  run: async ({
    unit,
    issue,
    priority,
  }: {
    unit: string;
    issue: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<DispatchPlumberResult> => {
    // Isomorphic execution payload simulation
    const ticketId = `PLUMB-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    
    console.log(`[ISOMORPHIC ACTION] Dispatching plumber to ${unit}. Issue: ${issue}. Priority: ${priority}`);
    
    return {
      status: 'DISPATCHED',
      timestamp,
      ticketId,
      unit,
      issue,
      priority,
    };
  },
});
