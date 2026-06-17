// Placeholder streaming node groups (demo only).
const nodes = [
  { group: 'Edge · NA-East', status: 'Live' },
  { group: 'Edge · EU-West', status: 'Live' },
  { group: 'Edge · APAC', status: 'Standby' },
];

export function StreamingTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {nodes.map((n) => (
        <div key={n.group} className="rounded-xl border border-gold/20 bg-smoke-800/80 p-6">
          <p className="font-display text-lg text-white">{n.group}</p>
          <p className="mt-1 text-sm text-violet-light">{n.status}</p>
        </div>
      ))}
    </div>
  );
}
