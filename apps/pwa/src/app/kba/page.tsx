import { KBASwarmCommand } from '@/components/kba/KBASwarmCommand';

export const metadata = {
  title: 'KBA Services | KOA Realm',
  description: 'KBA Services Command Node',
};

export default function KBADashboard() {
  return (
    <main className="min-h-screen bg-plate-950 p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-gold font-serif text-3xl tracking-widest uppercase">
            KBA Command Center
          </h1>
          <p className="text-plate-400 font-sans text-sm tracking-wider mt-2 uppercase">
            Node: Active | Uplink: Secured
          </p>
        </div>
        <KBASwarmCommand />
      </div>
    </main>
  );
}
