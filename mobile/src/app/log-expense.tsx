import { useRouter } from 'expo-router';

import { createExpense } from '@/api/expenses';
import { useSession } from '@/auth/session-context';
import { ExpenseFormSheet } from '@/components/log-expense/expense-form-sheet';
import { useTranslation } from '@/i18n/translation-context';

/**
 * The Log Button's destination (mobile ticket #5). A root-stack route, not a
 * screen inside `(app)/` — the tab bar is `expo-router/ui`
 * (components/app-tabs.tsx), where every route under `(app)/` becomes a tab
 * slot, so this lives as a sibling of `(app)` in app/_layout.tsx's root
 * Stack, inside the same `Stack.Protected guard={!!user}` block, presented
 * with `presentation: 'formSheet'`. The form itself is ExpenseFormSheet,
 * shared with the edit route (app/edit-expense/[id].tsx).
 */
export default function LogExpenseScreen() {
  const { token } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  if (!token) return null;

  return (
    <ExpenseFormSheet
      title={t('expenseForm.title')}
      submitLabel={t('expenseForm.submit')}
      onSubmit={async (values) => {
        await createExpense(token, values);
        router.back();
      }}
    />
  );
}
