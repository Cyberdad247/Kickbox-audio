// Placeholder tenant/maintenance data (demo only).
const tenants = [
  { name: 'Obsidian Tower · Unit 12', status: 'Occupied' },
  { name: 'Gold Quarter · Unit 4', status: 'Maintenance' },
  { name: 'Violet Heights · Unit 8', status: 'Occupied' },
];

export function PropertiesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tenants.map((t) => (
        <div key={t.name} className="rounded-xl border border-gold/20 bg-smoke-800/80 p-6">
          <p className="font-display text-lg text-white">{t.name}</p>
          <p className="mt-1 text-sm text-violet-light">{t.status}</p>
        </div>
      ))}
    </div>
  );
}
