import { ChevronRight, Home } from 'lucide-react';
import { Link, useParams } from 'react-router';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Render label with Home icon for the first item, plain text otherwise */
function BreadcrumbLabel({ label, index }: { label: string; index: number }) {
  if (index === 0) {
    return (
      <span className="flex items-center gap-1">
        <Home className="h-4 w-4" data-testid="breadcrumb-home-icon" />
        {label}
      </span>
    );
  }
  return <>{label}</>;
}

/** Build breadcrumb items from route params */
function buildBreadcrumbItems(params: { epicId?: string; storyId?: string }): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Epics', href: '/' }];

  if (params.epicId) {
    items.push({ label: params.epicId });
  } else if (params.storyId) {
    items.push({ label: params.storyId });
  }

  return items;
}

export function Breadcrumb() {
  const params = useParams<{
    epicId?: string;
    storyId?: string;
  }>();

  const items = buildBreadcrumbItems(params);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 text-text-muted"
                aria-hidden={true}
                data-testid="breadcrumb-separator"
              />
            )}
            {item.href && !isLast ? (
              <Link to={item.href} className="text-text-muted hover:text-primary transition-colors">
                <BreadcrumbLabel label={item.label} index={index} />
              </Link>
            ) : (
              <span className={isLast ? 'text-text font-medium' : 'text-text-muted'}>
                <BreadcrumbLabel label={item.label} index={index} />
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
