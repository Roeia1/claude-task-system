import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageWrapper } from './storybook-page-wrapper.tsx';

describe('PageWrapper', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children inside Layout with header', () => {
    render(
      <PageWrapper route="/">
        <div data-testid="test-content">Test Content</div>
      </PageWrapper>,
    );

    // Verify header with SAGA Dashboard branding
    expect(screen.getByText('SAGA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Verify children render
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows correct breadcrumb for root route', () => {
    render(
      <PageWrapper route="/">
        <div>Content</div>
      </PageWrapper>,
    );

    // Verify breadcrumb shows "Board" for root
    expect(screen.getByText('Board')).toBeInTheDocument();
  });

  it('shows correct breadcrumb for epic detail route', () => {
    render(
      <PageWrapper route="/epic/my-test-epic">
        <div>Epic Detail Content</div>
      </PageWrapper>,
    );

    // Verify breadcrumb shows epic slug
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('my-test-epic')).toBeInTheDocument();
  });

  it('shows correct breadcrumb for story detail route', () => {
    render(
      <PageWrapper route="/story/my-story">
        <div>Story Detail Content</div>
      </PageWrapper>,
    );

    // Verify breadcrumb trail
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('my-story')).toBeInTheDocument();
  });

  it('renders with default route when not specified', () => {
    render(
      <PageWrapper>
        <div>Default Content</div>
      </PageWrapper>,
    );

    // Should still render header and content
    expect(screen.getByText('SAGA')).toBeInTheDocument();
    expect(screen.getByText('Default Content')).toBeInTheDocument();
  });
});
