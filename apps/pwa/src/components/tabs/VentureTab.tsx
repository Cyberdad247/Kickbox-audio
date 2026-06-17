// Placeholder venture holdings (demo only).
const ventures = [
  { name: 'Helio Labs', stake: 'Seed' },
  { name: 'Camelot Capital', stake: 'Series A' },
];

export function VentureTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ventures.map((v) => (
        <div key={v.name} className="rounded-xl border border-gold/20 bg-smoke-800/80 p-6">
          <p className="font-display text-lg text-white">{v.name}</p>
          <p className="mt-1 text-sm text-violet-light">{v.stake}</p>
        </div>
      ))}
    </div>
  );
}
