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

  if (variant === "light") {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className={`${textSize} font-extrabold leading-none tracking-tight text-white`}>
          SDA
        </div>
        <div className="mt-1 text-xs font-semibold tracking-[0.35em] text-white/70">
          RÉNOVATION
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`flex items-baseline ${textSize} font-extrabold leading-none tracking-tight`}>
        <span className="bg-gradient-to-br from-brand-orange to-brand-orange-dark bg-clip-text text-transparent">
          S
        </span>
        <span className="bg-gradient-to-br from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">
          D
        </span>
        <span className="bg-gradient-to-br from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">
          A
        </span>
      </div>
      <div className="mt-1 text-xs font-semibold tracking-[0.35em] text-brand-navy">
        RÉNOVATION
      </div>
    </div>
  );
}
