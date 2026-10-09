import type { MediaListDef } from '@/constants/mediaLists';
import { paths } from '@/constants/routes';
import { useInView } from '@/hooks/useInView';
import { useMediaList } from '@/hooks/useMediaQueries';
import { MediaRow } from './MediaRow';

/** A MediaRow fed by a TMDB list. Only fetches once it scrolls near the screen. */
export function ListRow({ def }: { def: MediaListDef }) {
  const [ref, inView] = useInView<HTMLElement>();
  const { data, isLoading, error } = useMediaList(def.path, def.mediaType, inView);

  const seeAllTo =
    def.seeAllPath ?? (def.browseCategory && def.mediaType ? `${paths.browse(def.mediaType)}?category=${def.browseCategory}` : undefined);

  return (
    <MediaRow
      sectionRef={ref}
      title={def.title}
      subtitle={def.subtitle}
      items={data?.results}
      isLoading={isLoading}
      error={error}
      seeAllTo={seeAllTo}
    />
  );
}
