import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
  label?: string;
  showPasswordToggle?: boolean;
}

const MobileInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, label, showPasswordToggle = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle && type === "password" 
      ? (showPassword ? "text" : "password") 
      : type;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              "flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              // Mobile optimizations
              "touch-manipulation selection:bg-primary/20",
              // Better touch targets
              "min-h-[48px] text-[16px]", // Prevents zoom on iOS
              // Enhanced focus states for mobile
              "focus:border-primary focus:shadow-lg transition-all duration-200",
              // Error states
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              // Icon spacing
              icon && "pl-10",
              // Password toggle spacing
              showPasswordToggle && "pr-12",
              // Focus ring enhancement
              isFocused && "ring-2 ring-primary/20 border-primary",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = "MobileInput";

export { MobileInput };
