import type { Preview, Decorator } from '@storybook/react-vite'
import '../src/index.css'

/**
 * Decorator that provides a dark theme container matching the dashboard's default styling.
 * This ensures stories render with the correct background and text colors.
 */
const withDarkTheme: Decorator = (Story) => (
  <div className="dark bg-background text-foreground min-h-screen p-4">
    <Story />
  </div>
)

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
}

export default preview