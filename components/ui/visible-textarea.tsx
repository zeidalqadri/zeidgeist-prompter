import * as React from "react"

// Extended CSS Properties interface to include webkit properties
interface ExtendedCSSProperties extends React.CSSProperties {
  WebkitTextFillColor?: string;
  WebkitAppearance?: 'none' | 'button' | 'textfield' | 'searchfield' | 'textarea' | 'push-button' | 'slider-horizontal' | 'slider-vertical' | 'listbox' | 'menulist';
  MozAppearance?: 'none' | 'button' | 'textfield';
  touchAction?: 'auto' | 'none' | 'pan-x' | 'pan-left' | 'pan-right' | 'pan-y' | 'pan-up' | 'pan-down' | 'pinch-zoom' | 'manipulation';
}

export type VisibleTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
  style?: ExtendedCSSProperties;
}

const VisibleTextarea = React.forwardRef<HTMLTextAreaElement, VisibleTextareaProps>(
  ({ className, style, ...props }, ref) => {
    // Inline styles with maximum specificity to override any CSS conflicts
    const forceVisibleStyle: ExtendedCSSProperties = {
      color: '#000000 !important',
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '16px', // Prevents zoom on iOS
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fontWeight: '500',
      lineHeight: '1.5',
      width: '100%',
      resize: 'none',
      outline: 'none',
      transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      // Override any possible CSS variables or computed styles
      WebkitTextFillColor: '#000000',
      // Mobile-specific improvements
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      touchAction: 'manipulation',
      ...style
    };

    const focusStyle: ExtendedCSSProperties = {
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