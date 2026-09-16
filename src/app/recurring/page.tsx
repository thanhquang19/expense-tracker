'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { RecurringTransaction } from '@/types';
import {
    fetchRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    fetchCategories,
    fetchPaymentMethods
} from '@/lib/api';
import { capitalize, formatCurrency, formatDate, parseLocalDate, toLocalDateString, getPeriodStart, getEffectiveDate } from '@/lib/utils';
import RecurringModal from '@/components/RecurringModal';
import BottomNav from '@/components/BottomNav';

const FREQUENCY_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    yearly: 'Yearly'
};

export default function RecurringPage() {
    const { user, loading: loadingUser } = useUser();
    const router = useRouter();
    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<RecurringTransaction | null>(null);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [recurringData, categoriesData, paymentMethodsData] = await Promise.all([
                fetchRecurringTransactions(user.id),
                fetchCategories(),
                fetchPaymentMethods(user.id)
            ]);
            setRecurring(recurringData);
            setCategories(categoriesData);
            setPaymentMethods(paymentMethodsData);
        } catch (error) {
            console.error('Failed to load recurring transactions', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!loadingUser && !user) {
            router.push('/login');
            return;
        }
        loadData();
    }, [user, loadingUser, router, loadData]);

    const handleSave = async (data: Omit<RecurringTransaction, 'id' | 'created_at' | 'next_run_date'>, editingId: number | null) => {
        if (editingId) {
            const original = recurring.find(r => r.id === editingId);
            const payload: Partial<Omit<RecurringTransaction, 'id' | 'created_at'>> = { ...data };
            // Rule hasn't fired yet (next_run_date still equals the original start_date) — safe to
            // move the schedule to match the edited start date instead of leaving it stale.
            if (original && original.next_run_date === original.start_date && data.start_date !== original.start_date) {
                payload.next_run_date = toLocalDateString(getPeriodStart(parseLocalDate(data.start_date), data.frequency));
            }
            const updated = await updateRecurringTransaction(editingId, payload);
            setRecurring(recurring.map(r => r.id === editingId ? updated : r));
        } else {
            const created = await addRecurringTransaction(data);
            setRecurring([created, ...recurring]);
        }
        setShowForm(false);
        setEditing(null);
    };

    const handleDelete = async (id: number) => {
        await deleteRecurringTransaction(id);
        setRecurring(recurring.filter(r => r.id !== id));
        setShowForm(false);
        setEditing(null);
    };

    if (loadingUser || !user) return null;

    return (
        <div className="p-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300">
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex-1">Recurring</h1>
                <button
                    onClick={() => { setEditing(null); setShowForm(true); }}
                    className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </header>

            {loading ? (
                <p className="text-center text-gray-400 dark:text-gray-500 mt-10">Loading...</p>
            ) : recurring.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
                    <RefreshCw className="mx-auto mb-3" size={32} />
                    <p>No recurring transactions yet.</p>
                    <p className="text-sm">Tap the + button to add one.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {recurring.map(r => {
                        const entryDate = parseLocalDate(r.next_run_date);
                        const effectiveDate = getEffectiveDate(entryDate, parseLocalDate(r.start_date), r.frequency);
                        return (
                            <button
                                key={r.id}
                                onClick={() => { setEditing(r); setShowForm(true); }}
                                className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">{r.transaction}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {FREQUENCY_LABELS[r.frequency]} · Due {formatDate(toLocalDateString(effectiveDate))} · Added {formatDate(r.next_run_date)}
                                        {!r.is_active && ' · Inactive'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{capitalize(r.category)} · {capitalize(r.payment_method)}</p>
                                </div>
                                <p className={`font-bold ${r.transaction_flow === 'Inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {r.transaction_flow === 'Inflow' ? '+' : '-'}{formatCurrency(Math.abs(r.amount))}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            <RecurringModal
                isOpen={showForm}
                editingRecurring={editing}
                categories={categories}
                paymentMethods={paymentMethods}
                onClose={() => { setShowForm(false); setEditing(null); }}
                onSave={handleSave}
                onDelete={handleDelete}
            />

            <BottomNav />
        </div>
    );
}
