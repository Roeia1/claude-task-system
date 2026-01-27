import { useParams } from 'react-router-dom';

export function StoryDetail() {
  const { epicSlug, storySlug } = useParams<{
    epicSlug: string;
    storySlug: string;
  }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Story: {storySlug}</h1>
      <p className="text-text-muted">
        Part of epic: {epicSlug}. Story details will be displayed here.
      </p>
    </div>
  );
}

export default StoryDetail;
