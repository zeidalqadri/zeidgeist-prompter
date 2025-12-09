import React from 'react';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-black-primary hover:bg-black-rich text-white-pure',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-black-primary',
  ghost: 'hover:bg-gray-100 text-black-primary',
  destructive: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-7 px-3 text-sm',
  lg: 'h-11 px-6 text-lg',
  icon: 'h-8 w-8 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
