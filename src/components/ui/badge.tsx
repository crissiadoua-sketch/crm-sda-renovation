export type BadgeTone = "green" | "blue" | "orange" | "gray" | "red" | "navy";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-brand-blue/10 text-brand-blue-dark",
  orange: "bg-brand-orange/10 text-brand-orange-dark",
  gray: "bg-slate-100 text-slate-600",
  red: "bg-red-100 text-red-700",
  navy: "bg-brand-navy/10 text-brand-navy",
};

export function Badge({
  children,
  tone = "gray",
  className = "",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
