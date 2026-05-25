---
title: 'Storybook Theme Support'
---

# Storybook Theme Support

This document explains how to use the dark and light theme support in Storybook for component development.

## Overview

Storybook has been configured with theme switching capability to help developers preview components in both light and dark modes. This ensures component compatibility across different theme variations and helps maintain consistent theming throughout the application.

## Features

- **Theme Toggle**: Easy switching between light and dark themes via the Storybook toolbar
- **Automatic Theme Application**: All stories automatically inherit the selected theme
- **Theme Provider Integration**: Uses the same `ThemeProvider` component as the main application
- **CSS Variable Support**: Leverages existing CSS custom properties for theme colors

## Usage

### Switching Themes

1. Open Storybook in your browser
2. Look for the theme button in the toolbar (shows "light theme" or "dark theme")
3. Click the theme button to switch between themes
4. All stories will automatically update to reflect the new theme

### Theme Persistence

The selected theme persists across:

- Different stories
- Browser sessions (via URL parameters)
- Story navigation

### Developing Components with Themes

When developing components, you can:

1. **Test Both Themes**: Switch between light and dark modes to ensure your component looks good in both
2. **Use Theme-Aware Colors**: Leverage CSS variables defined in `globals.css` for consistent theming
3. **Preview in Context**: See how components appear with the actual theme styling applied

## Implementation Details

### Storybook Configuration

The theme support is implemented using:

- `@storybook/addon-themes`: Official Storybook addon for theme switching
- Custom decorators in `.storybook/preview.tsx` that wrap stories with `ThemeProvider`
- Theme configuration that applies CSS classes (`light`/`dark`) to enable theme switching

### CSS Integration

The theming system uses CSS custom properties defined in `src/app/globals.css`:

```css
:root {
  --background: hsla(0, 0%, 100%, 1);
  --foreground: hsla(0, 0%, 3%, 1);
  /* ... other light theme variables */
}

.dark {
  --background: hsla(0, 0%, 8%, 1);
  --foreground: hsla(0, 0%, 94%, 1);
  /* ... other dark theme variables */
}
```

### Theme Provider Integration

Stories are automatically wrapped with the `ThemeProvider` component, ensuring that:

- Theme context is available to all components
- Theme switching works consistently
- Components receive proper theme information

## Best Practices

1. **Use CSS Variables**: Always use the defined CSS custom properties for colors instead of hardcoded values
2. **Test Both Themes**: Always verify components in both light and dark modes during development
3. **Semantic Color Tokens**: Use semantic color tokens (like `--accent`, `--background`) rather than specific color values
4. **Accessibility**: Ensure sufficient contrast in both themes by testing with Storybook's a11y addon

## Troubleshooting

### Theme Not Applying

If theme switching doesn't work:

1. Check that the story is properly wrapped with decorators
2. Verify CSS variables are defined in `globals.css`
3. Ensure components use CSS variables instead of hardcoded colors

### Component Not Updating

If a component doesn't update when switching themes:

1. Verify the component uses theme-aware CSS properties
2. Check that the component is properly listening to theme context
3. Ensure CSS transitions are not interfering with theme changes

## Related Files

- `.storybook/main.ts` - Storybook configuration with themes addon
- `.storybook/preview.tsx` - Theme decorators and configuration
- `src/app/globals.css` - Theme CSS variables and styling
- `src/components/ThemeProvider/` - Theme provider component
- `src/components/ThemeToggle/` - Application theme toggle component
