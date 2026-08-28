'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Activity } from '@/types';
import { capitalize, toLocalDateString } from '@/lib/utils';
import { useUser } from '@/components/UserContext';

interface TransactionModalProps {
    isOpen: boolean;
    editingActivity: Activity | null;
    categories: string[];
    paymentMethods: string[];
    onClose: () => void;
    onSave: (activity: Omit<Activity, 'id' | 'created_at'>, editingId: number | null) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

export default function TransactionModal({ isOpen, editingActivity, categories, paymentMethods, onClose, onSave, onDelete }: TransactionModalProps) {
    const { user } = useUser();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        date: toLocalDateString(new Date()),
        transaction: '',
        amount: 0,
        transaction_flow: 'Outflow' as 'Inflow' | 'Outflow',
        payment_method: '',
        category: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        if (editingActivity) {
            setForm({
                date: editingActivity.date,
                transaction: editingActivity.transaction,
                amount: Math.abs(editingActivity.amount),
                transaction_flow: editingActivity.transaction_flow,
                payment_method: editingActivity.payment_method,
                category: editingActivity.category
            });
        } else {
            setForm({
                date: toLocalDateString(new Date()),
                transaction: '',
                amount: 0,
                transaction_flow: 'Outflow',
                payment_method: paymentMethods[0] || '',
                category: categories[0] || ''
            });
        }
    }, [isOpen, editingActivity, categories, paymentMethods]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const activityData = {
                date: form.date,
                transaction: form.transaction,
                amount: form.transaction_flow === 'Outflow' ? -Math.abs(form.amount) : Math.abs(form.amount),
                category: form.category,
                transaction_flow: form.transaction_flow,
                payment_method: form.payment_method,
                user_id: user.id
            };
            await onSave(activityData, editingActivity ? editingActivity.id : null);
        } catch (error) {
            console.error('Failed to save transaction', error);
            alert('Failed to save transaction. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingActivity) return;
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await onDelete(editingActivity.id);
        } catch (error) {
            console.error('Failed to delete transaction', error);
            alert('Failed to delete transaction.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editingActivity ? 'Edit Transaction' : 'Add Transaction'}</h2>
                    <div className="flex items-center gap-3">
                        {editingActivity && (
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

                    {/* Amount & Date Row */}
                    <div className="grid grid-cols-2 gap-4">
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
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 h-[54px] bg-white dark:bg-gray-700 dark:text-white"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Description Row */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Lunch"
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

                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                editingActivity ? 'Update Transaction' : 'Save Transaction'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
