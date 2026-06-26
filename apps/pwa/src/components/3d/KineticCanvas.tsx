'use client';

type KineticCanvasProps = {
  className?: string;
};

export default function KineticCanvas({ className = '' }: KineticCanvasProps) {
  return (
    <div
      aria-hidden="true"
      className={`${className} pointer-events-none bg-[radial-gradient(circle_at_50%_10%,rgba(157,78,221,0.18),transparent_24%),radial-gradient(circle_at_80%_80%,rgba(212,175,55,0.12),transparent_28%),linear-gradient(180deg,#0D0D11_0%,#050505_100%)]`}
    />
  );
}
