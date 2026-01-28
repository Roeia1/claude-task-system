import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * Test component to verify Tailwind CSS and SAGA theme integration in Storybook.
 * This demonstrates that all custom color tokens render correctly.
 */
const ThemeTest = () => (
  <div className="space-y-6">
    <section>
      <h2 className="text-lg font-semibold mb-3">Background Colors</h2>
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-bg-dark rounded flex items-center justify-center text-xs">
          bg-dark
        </div>
        <div className="w-20 h-20 bg-bg rounded flex items-center justify-center text-xs">
          bg
        </div>
        <div className="w-20 h-20 bg-bg-light rounded flex items-center justify-center text-xs">
          bg-light
        </div>
      </div>
    </section>

    <section>
      <h2 className="text-lg font-semibold mb-3">Text Colors</h2>
      <p className="text-text">Default text color</p>
      <p className="text-text-muted">Muted text color</p>
    </section>

    <section>
      <h2 className="text-lg font-semibold mb-3">Status Colors</h2>
      <div className="flex gap-4">
        <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
          Ready (Gray)
        </span>
        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
          In Progress (Primary)
        </span>
        <span className="px-3 py-1 bg-danger text-text rounded-full text-sm">
          Blocked (Danger)
        </span>
        <span className="px-3 py-1 bg-success text-text rounded-full text-sm">
          Completed (Success)
        </span>
      </div>
    </section>

    <section>
      <h2 className="text-lg font-semibold mb-3">Card Component</h2>
      <div className="bg-card text-card-foreground p-4 rounded-lg border border-border">
        <h3 className="font-medium">Card Title</h3>
        <p className="text-muted-foreground text-sm">
          Card content with muted text
        </p>
      </div>
    </section>
  </div>
)

const meta: Meta<typeof ThemeTest> = {
  title: 'Theme/Color Tokens',
  component: ThemeTest,
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates the SAGA Dashboard color tokens and verifies Tailwind CSS integration.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ThemeTest>

export const AllColors: Story = {}
