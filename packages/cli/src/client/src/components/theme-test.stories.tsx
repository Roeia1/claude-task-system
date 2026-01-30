import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

/**
 * Test component to verify Tailwind CSS and SAGA theme integration in Storybook.
 * This demonstrates that all custom color tokens render correctly.
 * Exported for use as component reference in Storybook meta.
 */
export const ThemeTest = () => (
  <div class="space-y-6">
    <section>
      <h2 class="text-lg font-semibold mb-3">Background Colors</h2>
      <div class="flex gap-4">
        <div class="w-20 h-20 bg-bg-dark rounded flex items-center justify-center text-xs">
          bg-dark
        </div>
        <div class="w-20 h-20 bg-bg rounded flex items-center justify-center text-xs">bg</div>
        <div class="w-20 h-20 bg-bg-light rounded flex items-center justify-center text-xs">
          bg-light
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-3">Text Colors</h2>
      <p class="text-text">Default text color</p>
      <p class="text-text-muted">Muted text color</p>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-3">Status Colors</h2>
      <div class="flex gap-4">
        <span class="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
          Ready (Gray)
        </span>
        <span class="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
          In Progress (Primary)
        </span>
        <span class="px-3 py-1 bg-danger text-text rounded-full text-sm">Blocked (Danger)</span>
        <span class="px-3 py-1 bg-success text-text rounded-full text-sm">Completed (Success)</span>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-3">Card Component</h2>
      <div class="bg-card text-card-foreground p-4 rounded-lg border border-border">
        <h3 class="font-medium">Card Title</h3>
        <p class="text-muted-foreground text-sm">Card content with muted text</p>
      </div>
    </section>
  </div>
);

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
};

type Story = StoryObj<typeof ThemeTest>;

const AllColors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Background Colors section
    await expect(canvas.getByText('Background Colors')).toBeInTheDocument();
    await expect(canvas.getByText('bg-dark')).toBeInTheDocument();
    await expect(canvas.getByText('bg')).toBeInTheDocument();
    await expect(canvas.getByText('bg-light')).toBeInTheDocument();

    // Verify Text Colors section
    await expect(canvas.getByText('Text Colors')).toBeInTheDocument();
    await expect(canvas.getByText('Default text color')).toBeInTheDocument();
    await expect(canvas.getByText('Muted text color')).toBeInTheDocument();

    // Verify Status Colors section
    await expect(canvas.getByText('Status Colors')).toBeInTheDocument();
    await expect(canvas.getByText('Ready (Gray)')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress (Primary)')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked (Danger)')).toBeInTheDocument();
    await expect(canvas.getByText('Completed (Success)')).toBeInTheDocument();

    // Verify Card Component section
    await expect(canvas.getByText('Card Component')).toBeInTheDocument();
    await expect(canvas.getByText('Card Title')).toBeInTheDocument();
    await expect(canvas.getByText('Card content with muted text')).toBeInTheDocument();
  },
};

export default meta;
export { AllColors };
