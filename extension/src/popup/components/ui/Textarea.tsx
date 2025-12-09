import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', style, ...props }, ref) => {
    // Use inline styles to ensure visibility (matching web app's VisibleTextarea pattern)
    const inlineStyles: React.CSSProperties = {
      backgroundColor: '#ffffff',
      color: '#000000',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      width: '100%',
      resize: 'vertical',
      minHeight: '80px',
      ...style,
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-black mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 ${className}`}
          style={inlineStyles}
          {...props}
        />
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
