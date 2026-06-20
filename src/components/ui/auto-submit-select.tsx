"use client";

export function AutoSubmitSelect({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={className}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.submit();
      }}
    >
      {children}
    </select>
  );
}
