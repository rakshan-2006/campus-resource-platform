import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed border";

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs rounded",
    md: "px-3.5 py-1.5 text-sm rounded-md",
    lg: "px-4 py-2 text-base rounded-md",
  };

  const variantStyles = {
    primary:
      "bg-slate-900 text-white border-transparent hover:bg-slate-800 focus:ring-slate-900",
    secondary:
      "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 focus:ring-slate-400",
    danger:
      "bg-red-600 text-white border-transparent hover:bg-red-700 focus:ring-red-600",
    outline:
      "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
    ghost:
      "bg-transparent text-slate-700 border-transparent hover:bg-slate-100 focus:ring-slate-400",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
