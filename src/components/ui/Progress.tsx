export default function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2.5 w-full overflow-hidden rounded-full bg-line/70"
    >
      <div
        className="h-full rounded-full bg-sol-gradient transition-[width] duration-700 ease-out"
        style={{ width: `${pct > 0 ? Math.max(pct, 3) : 0}%` }}
      />
    </div>
  );
}
