import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
        >
          {label}
          {props.required && <span className="text-[#EF4444] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full h-10 rounded-xl border bg-[#F7F9FC] dark:bg-[#0B1120] text-sm text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#6B7280]/70 dark:placeholder:text-[#9CA3AF]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8] ${
            error
              ? 'border-[#EF4444] focus-visible:ring-[#EF4444]'
              : 'border-[#E5E7EB] dark:border-[#263247]'
          } ${leftIcon ? 'pl-9' : 'px-3.5'} ${rightSlot ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-[#EF4444] dark:text-red-400">{error}</p>}
      {!error && hint && (
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{hint}</p>
      )}
    </div>
  );
}
