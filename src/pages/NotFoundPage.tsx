import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { paths } from '@/constants/routes';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That page doesn’t exist."
      action={<Link to={paths.home}>Back to home</Link>}
    />
  );
}
