type SubmitterIdentityProps = {
  name?: string | null;
  email?: string | null;
  align?: "left" | "center";
  className?: string;
};

export function SubmitterIdentity({
  name,
  email,
  align = "left",
  className = "",
}: SubmitterIdentityProps) {
  const displayName = name?.trim() || "Submitter";
  const displayEmail = email?.trim() || "Email unavailable";

  return (
    <span
      className={`block min-w-0 ${align === "center" ? "text-center" : "text-left"} ${className}`.trim()}
      aria-label={`Submitted by ${displayName}, ${displayEmail}`}
    >
      <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
      <span className="block truncate text-xs text-slate-500">{displayEmail}</span>
    </span>
  );
}
