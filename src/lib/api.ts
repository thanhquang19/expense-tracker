import { supabase } from './supabase';
import { Activity, Category, PaymentMethod, RecurringTransaction, ShoppingListItem } from '@/types';
import { parseLocalDate, toLocalDateString, getNextOccurrence, getPeriodStart, getEffectiveDate } from './utils';

const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

export const fetchActivities = async (userId?: number): Promise<Activity[]> => {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return [];
    }

    let query = supabase
        .from('activity')
        .select('*')
        .order('date', { ascending: false })
        .limit(5000000);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }

    return data as Activity[];
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('activity')
        .insert([activity])
        .select()
        .single();

    if (error) {
        console.error('Error adding activity:', error);
        console.error('Error Details:', error.message, error.details, error.hint);
        throw error;
    }

    return data as Activity;
};

export const updateActivity = async (id: number, activity: Partial<Omit<Activity, 'id' | 'created_at'>>): Promise<Activity> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('activity')
        .update(activity)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating activity:', error);
        throw error;
    }

    return data as Activity;
};

export const deleteActivity = async (id: number): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('activity')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting activity:', error);
        throw error;
    }
};

export const updateUserProfile = async (
    id: number,
    profile: { user_name: string; user_email: string }
): Promise<{ id: number; user_name: string; user_email: string }> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('user')
        .update(profile)
        .eq('id', id)
        .select('id, user_name, user_email')
        .single();

    if (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }

    return data;
};

export const fetchCategories = async (userId?: number): Promise<string[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    let query = supabase
        .from('category')
        .select('category')
        .order('category');

    // System categories (belong_to is null) plus the user's own.
    query = userId ? query.or(`belong_to.is.null,belong_to.eq.${userId}`) : query.is('belong_to', null);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }

    return data.map((c: any) => c.category);
};

export const fetchPaymentMethods = async (userId?: number): Promise<string[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    let query = supabase
        .from('payment_method')
        .select('payment_method')
        .order('payment_method');

    // System payment methods (belong_to is null, i.e. "Cash") plus the user's own.
    query = userId ? query.or(`belong_to.is.null,belong_to.eq.${userId}`) : query.is('belong_to', null);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }

    return data.map((pm: any) => pm.payment_method);
};

export const fetchCategoriesWithIds = async (userId?: number): Promise<Category[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    let query = supabase
        .from('category')
        .select('id, category, belong_to')
        .order('category');

    query = userId ? query.or(`belong_to.is.null,belong_to.eq.${userId}`) : query.is('belong_to', null);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }

    return data as Category[];
};

export const addCategory = async (category: string, userId: number): Promise<Category> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('category')
        .insert([{ category, belong_to: userId }])
        .select()
        .single();

    if (error) {
        console.error('Error adding category:', error);
        throw error;
    }

    return data as Category;
};

export const updateCategory = async (id: number, category: string): Promise<Category> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('category')
        .update({ category })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating category:', error);
        throw error;
    }

    return data as Category;
};

export const deleteCategory = async (id: number): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('category')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

export const fetchPaymentMethodsWithIds = async (userId: number): Promise<PaymentMethod[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const { data, error } = await supabase
        .from('payment_method')
        .select('id, payment_method, belong_to')
        .or(`belong_to.is.null,belong_to.eq.${userId}`)
        .order('payment_method');

    if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }

    return data as PaymentMethod[];
};

export const addPaymentMethod = async (paymentMethod: string, userId: number): Promise<PaymentMethod> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('payment_method')
        .insert([{ payment_method: paymentMethod, belong_to: userId }])
        .select()
        .single();

    if (error) {
        console.error('Error adding payment method:', error);
        throw error;
    }

    return data as PaymentMethod;
};

export const updatePaymentMethod = async (id: number, paymentMethod: string): Promise<PaymentMethod> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('payment_method')
        .update({ payment_method: paymentMethod })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating payment method:', error);
        throw error;
    }

    return data as PaymentMethod;
};

export const deletePaymentMethod = async (id: number): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('payment_method')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting payment method:', error);
        throw error;
    }
};

export const fetchRecurringTransactions = async (userId: number): Promise<RecurringTransaction[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const { data, error } = await supabase
        .from('recurring_transaction')
        .select('*')
        .eq('user_id', userId)
        .order('next_run_date');

    if (error) {
        console.error('Error fetching recurring transactions:', error);
        throw error;
    }

    const rows = (data || []) as RecurringTransaction[];

    // Keep next_run_date aligned to its period start even for rules that aren't due yet,
    // so the displayed "Next" date is always correct instead of only updating once fired.
    const misaligned = rows
        .filter(rt => rt.is_active)
        .map(rt => ({ rt, aligned: toLocalDateString(getPeriodStart(parseLocalDate(rt.next_run_date), rt.frequency)) }))
        .filter(({ rt, aligned }) => aligned !== rt.next_run_date);

    if (misaligned.length > 0) {
        await Promise.all(
            misaligned.map(({ rt, aligned }) =>
                supabase.from('recurring_transaction').update({ next_run_date: aligned }).eq('id', rt.id)
            )
        );
        misaligned.forEach(({ rt, aligned }) => { rt.next_run_date = aligned; });
    }

    return rows;
};

export const addRecurringTransaction = async (
    recurring: Omit<RecurringTransaction, 'id' | 'created_at' | 'next_run_date'>
): Promise<RecurringTransaction> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    // First occurrence is dated to the start of its period (e.g. the 1st of the month
    // for monthly rules), not whatever day-of-month the rule happened to be created on.
    const nextRunDate = toLocalDateString(getPeriodStart(parseLocalDate(recurring.start_date), recurring.frequency));

    const { data, error } = await supabase
        .from('recurring_transaction')
        .insert([{ ...recurring, next_run_date: nextRunDate }])
        .select()
        .single();

    if (error) {
        console.error('Error adding recurring transaction:', error);
        throw error;
    }

    return data as RecurringTransaction;
};

export const updateRecurringTransaction = async (
    id: number,
    recurring: Partial<Omit<RecurringTransaction, 'id' | 'created_at'>>
): Promise<RecurringTransaction> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('recurring_transaction')
        .update(recurring)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating recurring transaction:', error);
        throw error;
    }

    return data as RecurringTransaction;
};

export const deleteRecurringTransaction = async (id: number): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('recurring_transaction')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting recurring transaction:', error);
        throw error;
    }
};

export const fetchShoppingListItems = async (userId: number): Promise<ShoppingListItem[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const { data, error } = await supabase
        .from('shopping_list_item')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');

    if (error) {
        console.error('Error fetching shopping list items:', error);
        throw error;
    }

    return data as ShoppingListItem[];
};

export const addShoppingListItem = async (
    item: Omit<ShoppingListItem, 'id' | 'created_at'>
): Promise<ShoppingListItem> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('shopping_list_item')
        .insert([item])
        .select()
        .single();

    if (error) {
        console.error('Error adding shopping list item:', error);
        throw error;
    }

    return data as ShoppingListItem;
};

export const updateShoppingListItem = async (
    id: number,
    item: Partial<Omit<ShoppingListItem, 'id' | 'created_at'>>
): Promise<ShoppingListItem> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('shopping_list_item')
        .update(item)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating shopping list item:', error);
        throw error;
    }

    return data as ShoppingListItem;
};

export const deleteShoppingListItem = async (id: number): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('shopping_list_item')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting shopping list item:', error);
        throw error;
    }
};

// Caps how many missed periods are backfilled in one pass (recovers gradually if the app
// hasn't been opened in a very long time, instead of generating years of activity at once).
const MAX_CATCHUP_OCCURRENCES = 24;

// Generates activity rows for every active recurring transaction whose next_run_date has
// arrived, then advances each rule to its next period. Intended to be called on app load
// so due transactions appear automatically without a dedicated server/cron process.
export const processDueRecurringTransactions = async (userId: number): Promise<Activity[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: dueRecurring, error } = await supabase
        .from('recurring_transaction')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .lte('next_run_date', toLocalDateString(today));

    if (error) {
        console.error('Error fetching due recurring transactions:', error);
        throw error;
    }

    const recurringList = (dueRecurring || []) as RecurringTransaction[];
    if (recurringList.length === 0) {
        return [];
    }

    const insertedActivities: Activity[] = [];

    for (const rt of recurringList) {
        // The anchor preserves the original day-of-month/weekday (e.g. rent due on the
        // 15th) so it can be reapplied to whichever period is currently being entered.
        const anchorDate = parseLocalDate(rt.start_date);
        // Re-snap to the period start in case this rule's next_run_date predates the
        // period-alignment fix (or drifted for any other reason). This drives *when* the
        // rule is entered (e.g. the 1st of the month), separate from the effective date.
        let cursor = getPeriodStart(parseLocalDate(rt.next_run_date), rt.frequency);
        const endLimit = rt.end_date ? parseLocalDate(rt.end_date) : null;
        const occurrences: { effectiveDate: string }[] = [];
        let deactivated = false;
        let count = 0;

        while (cursor <= today && count < MAX_CATCHUP_OCCURRENCES) {
            const effectiveDate = getEffectiveDate(cursor, anchorDate, rt.frequency);
            if (endLimit && effectiveDate > endLimit) {
                deactivated = true;
                break;
            }

            occurrences.push({ effectiveDate: toLocalDateString(effectiveDate) });
            cursor = getNextOccurrence(cursor, rt.frequency);
            count++;
        }

        if (occurrences.length === 0 && !deactivated) {
            continue;
        }

        // Optimistic lock: only advance/insert if next_run_date still matches what we just
        // read. If a concurrent call (e.g. a duplicate effect invocation) already advanced
        // it, this update matches zero rows and we skip, avoiding double-generated activity.
        const { data: claimed, error: claimError } = await supabase
            .from('recurring_transaction')
            .update({ next_run_date: toLocalDateString(cursor), is_active: !deactivated })
            .eq('id', rt.id)
            .eq('next_run_date', rt.next_run_date)
            .select();

        if (claimError) {
            console.error('Error advancing recurring transaction schedule:', claimError);
            continue;
        }
        if (!claimed || claimed.length === 0) {
            continue;
        }

        if (occurrences.length > 0) {
            const activitiesForRule = occurrences.map(({ effectiveDate }) => ({
                date: effectiveDate,
                transaction: rt.transaction,
                amount: rt.transaction_flow === 'Outflow' ? -Math.abs(rt.amount) : Math.abs(rt.amount),
                category: rt.category,
                transaction_flow: rt.transaction_flow,
                payment_method: rt.payment_method,
                user_id: userId,
                recurring_id: rt.id
            }));

            const { data: inserted, error: insertError } = await supabase
                .from('activity')
                .insert(activitiesForRule)
                .select();

            if (insertError) {
                console.error('Error auto-generating recurring activities:', insertError);
                continue;
            }
            insertedActivities.push(...(inserted as Activity[]));
        }
    }

    return insertedActivities;
};

