import { ChevronRight, Home } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb() {
  const params = useParams<{ slug?: string; epicSlug?: string; storySlug?: string }>();

  const items: BreadcrumbItem[] = [{ label: 'Epics', href: '/' }];

  // Build breadcrumb based on current route
  if (params.slug) {
    // Epic detail page: /epic/:slug
    items.push({ label: params.slug });
  } else if (params.epicSlug && params.storySlug) {
    // Story detail page: /epic/:epicSlug/story/:storySlug
    items.push({ label: params.epicSlug, href: `/epic/${params.epicSlug}` });
    items.push({ label: params.storySlug });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />}
            {item.href && !isLast ? (
              <Link to={item.href} className="text-text-muted hover:text-primary transition-colors">
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              <span className={isLast ? 'text-text font-medium' : 'text-text-muted'}>
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
