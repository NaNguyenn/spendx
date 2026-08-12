import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useTranslation } from '@/i18n/translation-context';

// Placeholder — mobile ticket #12 ("Leaderboard: Shareable Spend ranking
// with ADR-0003 invariant suite") builds the real ranking and Friend
// Requests surface.
export default function LeaderboardScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('tab.leaderboard')}
      note={t('leaderboard.comingSoon')}
    />
  );
}
