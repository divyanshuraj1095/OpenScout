import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, type = "text", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full px-3 py-2 text-sm bg-white border ${
            error ? "border-red-500 focus:ring-red-200" : "border-neutral-200 focus:border-black focus:ring-neutral-100"
          } rounded-lg shadow-sm focus:outline-none focus:ring-4 transition-all duration-200 placeholder:text-neutral-400 text-neutral-900 ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
        {!error && helperText && <span className="text-xs text-neutral-500">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
