export function Logo({
  className = "",
  variant = "color",
  size = "lg",
}: {
  className?: string;
  variant?: "color" | "light";
  size?: "lg" | "md";
}) {
  const textSize = size === "lg" ? "text-5xl" : "text-3xl";

  const renovationColor = variant === "light" ? "text-white/70" : "text-brand-navy";

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`flex items-baseline ${textSize} font-extrabold leading-none tracking-tight bg-gradient-to-br from-brand-orange to-brand-orange-dark bg-clip-text text-transparent`}>
        SDA
      </div>
      <div className={`mt-1 text-xs font-semibold tracking-[0.35em] ${renovationColor}`}>
        RÉNOVATION
      </div>
    </div>
  );
}
