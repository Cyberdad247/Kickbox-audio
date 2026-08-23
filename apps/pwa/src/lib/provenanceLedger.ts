export const ProvenanceLedgerService = {
  record: async (command: string, outcome: string) => {
    try {
      // By using relative /api path, Vite proxy handles dev,
      // and typical cloud deployment handles production mapping.
      const apiUrl = '/api/provenance';

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          outcome,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to write to Provenance Ledger:', error);
    }
  },
};
