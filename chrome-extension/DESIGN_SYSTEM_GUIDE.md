# mstprmpt chrome extension - design system implementation guide

## Overview

this document provides comprehensive guidelines for implementing the chrome extension ui that maintains perfect visual consistency with the mstprmpt web application. The extension must feel like a natural extension of the web app, not a separate product.

## core design principles

### 1. visual consistency
- **Identical Color Palette**: Use exact same color tokens as web app
- **typography matching**: ibm plex sans font, same sizes and weights
- **Component Styling**: Identical button heights, padding, and interactions
- **Layout Patterns**: Consistent spacing and grid-based layouts

### 2. Interaction Patterns
- **Keyboard Shortcuts**: Cmd/Ctrl+Enter for enhancement (matching web app)
- **Focus States**: Black ring indicators matching web app
- **Hover Effects**: Subtle background changes, no dramatic transformations
- **Loading States**: Consistent spinners and progress indicators

### 3. Content Hierarchy
- **Clear Sections**: Raw input, refined output, history
- **Consistent Labeling**: Match web app terminology exactly
- **Progressive Disclosure**: History toggle, expandable sections

## CSS Design System

### Color Tokens
```css
:root {
  /* Primary Colors - Matching Web App */
  --black-primary: #000000;
  --black-rich: #1a1a1a;
  --white-pure: #ffffff;
  --white-soft: #fafafa;
  
  /* Gray Scale - Matching Web App */
  --gray-10: #f5f5f5;    /* Soft backgrounds */
  --gray-30: #cccccc;    /* Input borders */
  --gray-60: #666666;    /* Secondary text */
  --gray-100: #f0f0f0;   /* Hover states */
  --gray-200: #e0e0e0;   /* Dividers */
  --gray-500: #999999;   /* Placeholder text */
  --gray-600: #666666;   /* Labels */
  --gray-700: #333333;   /* Dark text */
  
  /* Layout */
  --border-radius: 0.375rem; /* 6px */
  --transition: all 0.2s ease-in-out;
}
```

### Typography Scale
```css
/* Matching Web App Typography */
.text-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
}

.text-body {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

.text-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.text-caption {
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
}
```

### Button Components
```css
/* Primary Button - Matching Web App */
.btn-primary {
  background: var(--black-primary);
  color: var(--white-pure);
  padding: 0 16px;
  height: 44px; /* h-11 equivalent */
  border-radius: var(--border-radius);
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.btn-primary:hover {
  background: var(--black-rich);
}

/* Secondary Button - Matching Web App */
.btn-secondary {
  background: var(--white-pure);
  color: var(--black-primary);
  border: 1px solid var(--gray-200);
  /* ... rest identical to primary */
}

.btn-secondary:hover {
  background: var(--gray-100);
}
```

### Form Components
```css
/* Textarea - Matching Web App */
.textarea {
  width: 100%;
  height: 112px; /* h-28 equivalent */
  padding: 12px;
  border: 1px solid var(--gray-30);
  border-radius: var(--border-radius);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: var(--transition);
}

.textarea:focus {
  outline: none;
  border-color: var(--black-primary);
  box-shadow: 0 0 0 1px var(--black-primary);
}
```

## Component Specifications

### 1. Popup Interface (400px width)

#### Header Section
- **Background**: `var(--white-pure)`
- **Border**: Bottom border `1px solid var(--gray-200)`
- **Title**: 20px, weight 600, color `var(--black-primary)`
- **Tagline**: 11px, color `var(--gray-500)`

#### Input Section
- **Label**: "Raw" - 16px, weight 500
- **Textarea**: 112px height, placeholder "Raw input..."
- **Hint**: "Press Cmd+Enter (or Ctrl+Enter) to refine" - 12px, color `var(--gray-500)`
- **button**: primary style, "refine"

#### Output Section
- **Background**: `var(--white-soft)` with `1px solid var(--gray-10)` border
- **Label**: "Refined" - 16px, weight 500
- **Source Badge**: 12px, background `var(--gray-100)`, rounded 12px
- **Content**: Pre-wrap formatting, scrollable
- **Actions**: Copy (secondary) + Repeat (primary) buttons

#### History Section
- **toggle**: "recollect [+]" - collapsible section
- **Table**: Grid layout with time, original, refined, actions
- **Hover**: Background `var(--gray-100)`

### 2. Content Script Injection

#### Enhancement Button
- **Size**: 32px × 32px
- **Background**: `var(--black-primary)`
- **text**: enhance (white)
- **Position**: Absolute, right 10px from input field
- **Hover**: Scale 1.05, background `var(--black-rich)`

### 3. Enhancement Overlay

#### Modal Structure
- **Backdrop**: `rgba(0,0,0,0.5)`
- **Modal**: White background, 12px border-radius
- **Header**: Title + close button
- **Content**: Enhanced prompt with improvements list
- **Actions**: "Use This Prompt" (primary) + "Copy to Clipboard" (secondary)

### 4. Settings Modal

#### Form Elements
- **Checkboxes**: 16px, accent color `var(--black-primary)`
- **Inputs**: Same styling as main form elements
- **Labels**: 14px, flex layout with gap 8px
- **Settings Background**: `var(--white-soft)` with 6px border-radius

## Layout Specifications

### Popup Dimensions
- **Width**: 400px (fixed)
- **Height**: Minimum 500px, auto-expand based on content
- **Padding**: 16px main sections
- **Margins**: 12-24px between major sections

### Responsive Considerations
- **Mobile Web**: When injected in mobile browsers, scale appropriately
- **High DPI**: Use vector icons and scalable elements
- **Text Scaling**: Support browser text scaling preferences

## Accessibility Requirements

### Keyboard Navigation
- **Tab Order**: Logical flow through all interactive elements
- **Focus Indicators**: Clear black ring (`1px solid var(--black-primary)`)
- **Shortcuts**: Cmd/Ctrl+Enter for enhancement (document in UI)

### Screen Reader Support
- **Labels**: All form controls have proper labels
- **ARIA**: Use `aria-label` and `aria-describedby` where needed
- **Status**: Announce enhancement completion and errors

### Color Contrast
- **AA Compliance**: 4.5:1 minimum contrast ratio
- **Primary Text**: Black on white = 21:1 (excellent)
- **Secondary Text**: `var(--gray-600)` on white = 7:1 (excellent)
- **Interactive States**: Maintain contrast in all states

## Animation and Transitions

### Timing Functions
```css
/* Standard Transitions */
.transition-standard {
  transition: all 0.2s ease-in-out;
}

/* Loading Spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### State Changes
- **Hover**: Subtle background color changes
- **Focus**: Immediate border color change with transition
- **Loading**: Spinner + disabled state
- **Success**: Brief green flash for successful actions

## Icon System

### Icon Guidelines
- **Style**: Use Unicode emojis for consistency across platforms
- **Size**: 16px for inline icons, 20px for buttons
- **Color**: Inherit from parent or use CSS color property
- **Accessibility**: Include `title` attributes for icon-only buttons

### Standard Icons
- **enhancement**: enhance text
- **copy**: copy text
- **repeat**: repeat text
- **settings**: settings text
- **help**: help text
- **history**: recollect text
- **close**: close text

## Error States and Feedback

### Error Styling
```css
.error-state {
  border-color: #dc2626;
  color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}
```

### Success States
```css
.success-state {
  border-color: #059669;
  color: #059669;
}
```

### Loading States
- **Button**: Show spinner, disable interaction
- **Content**: Skeleton loading or spinner overlay
- **Progress**: For chunked processing, show progress bar

## Testing Checklist

### Visual Consistency
- [ ] Colors match web app exactly (use color picker to verify)
- [ ] Typography sizes and weights are identical
- [ ] Button heights and padding match (36px height)
- [ ] Border radius consistent (6px standard)
- [ ] Focus states match web app

### Interaction Consistency
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Enter)
- [ ] Hover states match web app behavior
- [ ] Transitions use same timing (0.2s ease-in-out)
- [ ] Error states styled consistently

### Accessibility
- [ ] Tab navigation works in logical order
- [ ] Focus indicators are visible and clear
- [ ] Screen reader can access all content
- [ ] Color contrast meets WCAG AA standards
- [ ] All interactive elements have proper labels

### Cross-Browser Testing
- [ ] Chrome (primary target)
- [ ] Edge (Chromium-based)
- [ ] Firefox (if planned)
- [ ] Safari (if planned)

## Implementation Notes

### CSS Custom Properties
Always use CSS custom properties for colors and measurements to ensure easy theme switching and consistency maintenance.

### Component Isolation
Use CSS modules or scoped styles to prevent conflicts with host page CSS when injecting content scripts.

### Performance Considerations
- **CSS**: Minimize reflows and repaints
- **Animations**: Use transform and opacity for smooth animations
- **Images**: Use SVG or emoji for scalable icons

### Dark Mode Support
Prepare for dark mode by using CSS custom properties that can be overridden:

```css
/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --white-pure: #000000;
    --black-primary: #ffffff;
    /* ... other color inversions */
  }
}
```

## File Structure

```
src/
├── popup/
│   ├── popup.html          # Main popup interface
│   ├── popup.css           # Styles matching web app
│   └── popup.js            # Popup logic
├── content/
│   ├── inject.js           # Content script injection
│   └── overlay.css         # Overlay modal styles
├── background/
│   └── service-worker.js   # Background service worker
└── styles/
    ├── variables.css       # CSS custom properties
    ├── components.css      # Reusable component styles
    └── utilities.css       # Utility classes
```

## Conclusion

This design system ensures the Chrome extension feels like a natural extension of the MstPrmpt web application. Every color, font size, interaction pattern, and animation should match the web app exactly. When in doubt, refer back to the web app implementation and copy the exact styling and behavior.

The goal is for users to have a seamless experience where the extension feels like a built-in feature of the web app, not a separate tool.