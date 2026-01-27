import { useParams } from 'react-router-dom';

export function EpicDetail() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Epic: {slug}</h1>
      <p className="text-text-muted">Epic details will be displayed here.</p>
    </div>
  );
}

export default EpicDetail;
