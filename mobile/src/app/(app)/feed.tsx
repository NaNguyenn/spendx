import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useTranslation } from '@/i18n/translation-context';

// Placeholder — mobile ticket #13 ("Feed: all Public expenses, newest
// first") builds the real stream.
export default function FeedScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('tab.feed')} note={t('feed.comingSoon')} />
  );
}
