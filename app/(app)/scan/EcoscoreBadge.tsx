const COLORS: Record<string, string> = {
  a: "bg-[#1e8f4e] text-white",
  b: "bg-[#7ab648] text-white",
  c: "bg-[#eeae0e] text-white",
  d: "bg-[#e67e22] text-white",
  e: "bg-[#c1392b] text-white",
};

export default function EcoscoreBadge({ grade }: { grade: string }) {
  const g = grade.toLowerCase();
  const color = COLORS[g] ?? "bg-muted-2 text-white";

  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold uppercase ${color}`}
      title={`Éco-score ${g.toUpperCase()}`}
    >
      {g}
    </span>
  );
}
