export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-2 outline-none focus:border-primary transition-colors placeholder-foreground/50 ${className}`}
      {...props}
    />
  );
}
