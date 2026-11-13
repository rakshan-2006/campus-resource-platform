import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = "", id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full px-3 py-1.5 text-sm bg-white border rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 ${
            error ? "border-red-500" : "border-slate-300"
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
