"use client";

export function SelectRedirect({
  options,
  defaultValue,
  paramName,
  extraParams,
  className,
}: {
  options: { value: string; label: string }[];
  defaultValue: string;
  paramName: string;
  extraParams?: string;
  className?: string;
}) {
  return (
    <select
      className={className ?? "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"}
      defaultValue={defaultValue}
      onChange={(e) => {
        const extra = extraParams ? `&${extraParams}` : "";
        window.location.href = `?${paramName}=${e.target.value}${extra}`;
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
