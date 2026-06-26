import { KineticBackground } from '../components/3d/KineticBackground';
import { Dashboard } from '../components/Dashboard';
import { LakishaEnclave } from '../components/hud/LakishaEnclave';

export default function Home() {
  return (
    <>
      <KineticBackground />
      <Dashboard />
      <LakishaEnclave />
    </>
  );
}
