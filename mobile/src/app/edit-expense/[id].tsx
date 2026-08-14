import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { updateExpense, deleteExpense } from '@/api/expenses';
import { useSession } from '@/auth/session-context';
import { FormError } from '@/components/auth/auth-screen';
import { SecondaryButton } from '@/components/form/secondary-button';
import { ExpenseFormSheet } from '@/components/log-expense/expense-form-sheet';
import type { Category } from '@/constants/category';
import type { SupportedCurrency } from '@/constants/currency';
import type { Visibility } from '@/constants/visibility';
import { useTranslation } from '@/i18n/translation-context';
import { amountInputFromDecimal } from '@/lib/amount-input';
import { getErrorMessage } from '@/lib/api-error-message';

/**
 * Editing an Expense from the Expenses tab (mobile ticket #6): the same
 * form sheet as logging, prefilled, plus a destructive delete action. A
 * root-stack `formSheet` sibling of log-expense for the same tab-bar
 * reason (see that file's header).
 *
 * The Expense's fields ride in as route params rather than being fetched:
 * the only way here is tapping a row the list just rendered, so the list's
 * copy is as fresh as a refetch would be, and there is no GET /expenses/:id
 * to call anyway. The enum-typed fields are cast, not validated — the
 * params come from our own `router.push` in app/(app)/index.tsx, and a
 * value the server would reject just comes back as a 400 rendered in the
 * form. Converted Amount is deliberately not passed: the sheet never shows
 * it, and it never changes on edit — the Original Amount is immutable after
 * logging (backend ADR-0008), so its Conversion Snapshot is frozen too. The
 * amount and currency render locked, and the PATCH body omits them: the
 * server rejects either field outright.
 */
export default function EditExpenseScreen() {
  const { token } = useSession();
  const router = useRouter();
  const { locale, t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    description: string;
    originalAmount: string;
    originalCurrency: string;
    category: string;
    visibility: string;
    expenseDate: string;
  }>();

  const [deleteError, setDeleteError] = useState<string | null>(null);

  // `expenseDate` is in the guard because dateFromCalendarString can't make
  // a meaningful picker value from a missing one; the rest degrade softly.
  if (!token || !params.id || !params.expenseDate) return null;
  const { id } = params;

  const confirmDelete = () => {
    Alert.alert(
      t('expenseForm.deleteConfirmTitle'),
      t('expenseForm.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('expenseForm.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleteError(null);
              try {
                await deleteExpense(token, id);
                router.back();
              } catch (error) {
                const result = getErrorMessage(error);
                setDeleteError(
                  result.kind === 'server' ? result.text : t(result.key),
                );
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ExpenseFormSheet
      title={t('expenseForm.editTitle')}
      submitLabel={t('expenseForm.saveChanges')}
      initial={{
        description: params.description ?? '',
        amountInput: amountInputFromDecimal(
          params.originalAmount ?? '',
          locale,
        ),
        currency: (params.originalCurrency ?? 'USD') as SupportedCurrency,
        category: (params.category ?? 'other') as Category,
        visibility: (params.visibility ?? 'private') as Visibility,
        expenseDate: params.expenseDate,
      }}
      amountLocked
      onSubmit={async ({ description, category, visibility, expenseDate }) => {
        await updateExpense(token, id, {
          description,
          category,
          visibility,
          ...(expenseDate ? { expenseDate } : {}),
        });
        router.back();
      }}
      footer={
        <>
          <FormError message={deleteError} />
          <SecondaryButton
            label={t('expenseForm.delete')}
            onPress={confirmDelete}
            destructive
          />
        </>
      }
    />
  );
}
