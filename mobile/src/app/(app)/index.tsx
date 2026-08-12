import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useTranslation } from '@/i18n/translation-context';

// Expenses is the landing tab (mobile/CONTEXT.md) and owns the `index`
// route inside the group. The real list/summary/statistics are mobile
// ticket #5 ("Expense logging UI: Log Button form and Expenses tab list")
// and #7 (personal statistics) — this is a placeholder until then.
export default function ExpensesScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('tab.expenses')}
      note={t('expenses.comingSoon')}
    />
  );
}
