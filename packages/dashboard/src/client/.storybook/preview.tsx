import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/index.css';

/**
 * Decorator that provides a dark theme container matching the dashboard's default styling.
 * This ensures stories render with the correct background and text colors.
 * Also disables animations for consistent visual snapshot testing.
 */
const withDarkTheme: Decorator = (Story) => (
  <div className="dark bg-background text-foreground min-h-screen p-4">
    <style>{`
      /* Disable animations for visual snapshot testing consistency */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `}</style>
    <Story />
  </div>
);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Disable Storybook's background addon - we use our dark theme
    },
  },
  decorators: [withDarkTheme],
};

export default preview;
