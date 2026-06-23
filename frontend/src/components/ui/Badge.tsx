import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
}

export const Badge: React.FC<BadgeProps> = ({ children, className = "", variant = "default", ...props }) => {
  const baseStyle = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors";

  const variants = {
    default: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
    outline: "bg-transparent text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
