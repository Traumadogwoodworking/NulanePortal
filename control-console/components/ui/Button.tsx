export function Button({ children, ...rest }: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className="rounded-full bg-gradient-to-r from-control-400 via-control-500 to-control-600 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-control-500/50 transition hover:scale-[1.01]"
      {...rest}
    >
      {children}
    </button>
  );
}
