'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { RecurringTransaction, RecurringFrequency } from '@/types';
import { capitalize, toLocalDateString } from '@/lib/utils';
import { useUser } from '@/components/UserContext';

interface RecurringModalProps {
    isOpen: boolean;
    editingRecurring: RecurringTransaction | null;
    categories: string[];
    paymentMethods: string[];
    onClose: () => void;
    onSave: (recurring: Omit<RecurringTransaction, 'id' | 'created_at' | 'next_run_date'>, editingId: number | null) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
];

export default function RecurringModal({ isOpen, editingRecurring, categories, paymentMethods, onClose, onSave, onDelete }: RecurringModalProps) {
    const { user } = useUser();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        transaction: '',
        amount: 0,
        transaction_flow: 'Outflow' as 'Inflow' | 'Outflow',
        payment_method: '',
        category: '',
        frequency: 'monthly' as RecurringFrequency,
        start_date: toLocalDateString(new Date()),
        end_date: '',
        is_active: true
    });

    useEffect(() => {
        if (!isOpen) return;
        if (editingRecurring) {
            setForm({
                transaction: editingRecurring.transaction,
                amount: Math.abs(editingRecurring.amount),
                transaction_flow: editingRecurring.transaction_flow,
                payment_method: editingRecurring.payment_method,
                category: editingRecurring.category,
                frequency: editingRecurring.frequency,
                start_date: editingRecurring.start_date,
                end_date: editingRecurring.end_date || '',
                is_active: editingRecurring.is_active
            });
        } else {
            setForm({
                transaction: '',
                amount: 0,
                transaction_flow: 'Outflow',
                payment_method: paymentMethods[0] || '',
                category: categories[0] || '',
                frequency: 'monthly',
                start_date: toLocalDateString(new Date()),
                end_date: '',
                is_active: true
            });
        }
    }, [isOpen, editingRecurring, categories, paymentMethods]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const recurringData = {
                transaction: form.transaction,
                amount: Math.abs(form.amount),
                category: form.category,
                transaction_flow: form.transaction_flow,
                payment_method: form.payment_method,
                frequency: form.frequency,
                start_date: form.start_date,
                end_date: form.end_date || null,
                is_active: form.is_active,
                user_id: user.id
            };
            await onSave(recurringData, editingRecurring ? editingRecurring.id : null);
        } catch (error) {
            console.error('Failed to save recurring transaction', error);
            alert('Failed to save recurring transaction. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingRecurring) return;
        if (!confirm('Delete this recurring transaction? Previously generated transactions will not be removed.')) return;
        try {
            await onDelete(editingRecurring.id);
        } catch (error) {
            console.error('Failed to delete recurring transaction', error);
            alert('Failed to delete recurring transaction.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editingRecurring ? 'Edit Recurring' : 'Add Recurring'}</h2>
                    <div className="flex items-center gap-3">
                        {editingRecurring && (
                            <button
                                onClick={handleDelete}
                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Flow Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${form.transaction_flow === 'Outflow' ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setForm({ ...form, transaction_flow: 'Outflow' })}
                        >
                            Out-flow
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${form.transaction_flow === 'Inflow' ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setForm({ ...form, transaction_flow: 'Inflow' })}
                        >
                            In-flow
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount</label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold ${form.transaction_flow === 'Inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>$</span>
                            <input
                                type="number"
                                className={`w-full pl-8 p-3 border rounded-xl text-lg font-bold outline-none focus:ring-2 bg-white dark:bg-gray-700 ${form.transaction_flow === 'Inflow' ? 'text-green-600 dark:text-green-400 focus:ring-green-100 border-green-200 dark:border-green-800' : 'text-red-600 dark:text-red-400 focus:ring-red-100 border-red-200 dark:border-red-800'}`}
                                value={form.amount || ''}
                                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Rent"
                            value={form.transaction}
                            onChange={(e) => setForm({ ...form, transaction: e.target.value })}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                        <select
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{capitalize(c)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
                        <select
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            value={form.payment_method}
                            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                        >
                            {paymentMethods.map(pm => (
                                <option key={pm} value={pm}>{capitalize(pm)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Frequency</label>
                        <select
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            value={form.frequency}
                            onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}
                        >
                            {FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start / End Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 h-[54px] bg-white dark:bg-gray-700 dark:text-white"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 h-[54px] bg-white dark:bg-gray-700 dark:text-white"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {editingRecurring && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            />
                            Active
                        </label>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={submitting || !form.transaction || !form.amount || !form.category || !form.payment_method}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                editingRecurring ? 'Update Recurring' : 'Save Recurring'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
