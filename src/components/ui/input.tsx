import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3 py-1.5 text-sm bg-white border rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 ${
            error ? "border-red-500" : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
