"use client";

export function Button({ children, variant = "primary", className = "", ...props }) {
  const baseStyle = "px-4 py-2 font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-blocky shadow-sm";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    secondary: "bg-secondary text-secondary-foreground hover:brightness-110",
    danger: "bg-danger text-white hover:brightness-110",
    outline: "border-2 border-surface-border text-foreground hover:bg-surface-hover",
    ghost: "text-foreground hover:bg-surface-hover"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
