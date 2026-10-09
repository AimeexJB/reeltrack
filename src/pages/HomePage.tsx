import { HeroBanner } from '@/components/home/HeroBanner';
import { RecommendedRow } from '@/components/home/RecommendedRow';
import { ListRow } from '@/components/media/ListRow';
import { HOME_LISTS } from '@/constants/mediaLists';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <RecommendedRow />
      {HOME_LISTS.map((def) => (
        <ListRow key={def.id} def={def} />
      ))}
    </>
  );
}
