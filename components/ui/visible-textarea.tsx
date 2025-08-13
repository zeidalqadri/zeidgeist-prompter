import * as React from "react"

export type VisibleTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
}

const VisibleTextarea = React.forwardRef<HTMLTextAreaElement, VisibleTextareaProps>(
  ({ className, style, ...props }, ref) => {
    // Inline styles with maximum specificity to override any CSS conflicts
    const forceVisibleStyle: React.CSSProperties = {
      color: '#000000 !important' as any,
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '16px', // Prevents zoom on iOS
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fontWeight: '500',
      lineHeight: '1.5',
      width: '100%',
      resize: 'none' as any,
      outline: 'none',
      transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      // Override any possible CSS variables or computed styles
      WebkitTextFillColor: '#000000',
      // Mobile-specific improvements
      WebkitAppearance: 'none' as any,
      MozAppearance: 'none' as any,
      appearance: 'none' as any,
      touchAction: 'manipulation' as any,
      ...style
    };

    const focusStyle: React.CSSProperties = {
      borderColor: '#000000',
      boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)',
    };

    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <textarea
        ref={ref}
        className={className}
        style={{
          ...forceVisibleStyle,
          ...(isFocused ? focusStyle : {})
        }}
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
    );
  }
)

VisibleTextarea.displayName = "VisibleTextarea"

export { VisibleTextarea }