// Placeholder streaming node groups (demo only).
const nodes = [
  { group: 'Edge - NA-East', status: 'Live' },
  { group: 'Edge - EU-West', status: 'Live' },
  { group: 'Edge - APAC', status: 'Standby' },
];

export function StreamingTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {nodes.map((n) => (
        <div
          key={n.group}
          className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl transition-shadow hover:shadow-gold"
        >
          <p className="font-display text-lg text-white">{n.group}</p>
          <p className="mt-1 text-sm text-violet-light">{n.status}</p>
        </div>
      ))}
    </div>
  );
}
