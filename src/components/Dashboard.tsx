'use client';

import { useState, useEffect } from 'react';
import {
    getBalances,
    getPeriodSummary,
    getCategorySummary,
    capitalize,
    formatCurrency,
    formatDate
} from '@/lib/utils';
import { Activity } from '@/types';
import { fetchActivities, addActivity, updateActivity, deleteActivity, fetchCategories, fetchPaymentMethods } from '@/lib/api';
import { Wallet, Plus, Calendar, ChevronRight, RotateCcw, Moon, Sun, Laptop, Loader2, User as UserIcon, Filter, X, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUser } from '@/components/UserContext';
import Link from 'next/link';

export default function Dashboard() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [summary, setSummary] = useState({ beginningBalance: 0, endingBalance: 0, activities: [] as Activity[] });
    const [categorySummary, setCategorySummary] = useState<{ category: string, amount: number }[]>([]);

    // Dynamic Data Lists
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
    const [showAll, setShowAll] = useState(false);

    // Filters
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const { theme, setTheme } = useTheme();
    const { user, loading: loadingUser } = useUser();
    const [mounted, setMounted] = useState(false);

    // Date Filters (Default to current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
    const [newTransaction, setNewTransaction] = useState({
        date: new Date().toISOString().split('T')[0],
        transaction: '',
        amount: 0,
        transaction_flow: 'Outflow' as 'Inflow' | 'Outflow',
        payment_method: '',
        category: ''
    });

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [activitiesData, categoriesData, paymentMethodsData] = await Promise.all([
                fetchActivities(user.id),
                fetchCategories(),
                fetchPaymentMethods(user.id)
            ]);

            setActivities(activitiesData);
            setAvailableCategories(categoriesData);
            setAvailablePaymentMethods(paymentMethodsData);

            // Set defaults for form if data exists
            if (categoriesData.length > 0 && paymentMethodsData.length > 0) {
                setNewTransaction(prev => ({
                    ...prev,
                    category: categoriesData[0],
                    payment_method: paymentMethodsData[0]
                }));
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 2. Calculate Period Summary
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Adjust end date to include the full day
        end.setHours(23, 59, 59, 999);

        const periodSummary = getPeriodSummary(activities, start, end);
        setSummary(periodSummary);

        // 3. Calculate Balances (All Time)
        const currentBalances = getBalances(activities);
        setBalances(currentBalances);

        // 4. Calculate Category Breakdown (for the period)
        const catSummary = getCategorySummary(periodSummary.activities);
        setCategorySummary(catSummary);

    }, [activities, startDate, endDate]);

    const handleSaveTransaction = async () => {
        setSubmitting(true);
        try {
            const activityData = {
                date: newTransaction.date,
                transaction: newTransaction.transaction,
                amount: newTransaction.transaction_flow === 'Outflow' ? -Math.abs(newTransaction.amount) : Math.abs(newTransaction.amount),
                category: newTransaction.category,
                transaction_flow: newTransaction.transaction_flow,
                payment_method: newTransaction.payment_method,
                user_id: user!.id
            };

            if (editingActivityId) {
                const updatedActivity = await updateActivity(editingActivityId, activityData);
                setActivities(activities.map(a => a.id === editingActivityId ? updatedActivity : a));
            } else {
                const savedActivity = await addActivity(activityData);
                setActivities([savedActivity, ...activities]);
            }

            setShowForm(false);
            setEditingActivityId(null);
            // Reset form but keep date and defaults
            setNewTransaction(prev => ({
                ...prev,
                transaction: '',
                amount: 0,
                transaction_flow: 'Outflow',
                category: availableCategories[0] || '',
                payment_method: availablePaymentMethods[0] || ''
            }));
        } catch (error) {
            console.error('Failed to save transaction', error);
            alert('Failed to save transaction. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        try {
            await deleteActivity(id);
            setActivities(activities.filter(a => a.id !== id));
            setShowForm(false);
            setEditingActivityId(null);
        } catch (error) {
            console.error('Failed to delete transaction', error);
            alert('Failed to delete transaction.');
        }
    };

    const handleEditClick = (activity: Activity) => {
        setEditingActivityId(activity.id);
        setNewTransaction({
            date: activity.date,
            transaction: activity.transaction,
            amount: Math.abs(activity.amount),
            transaction_flow: activity.transaction_flow,
            payment_method: activity.payment_method,
            category: activity.category
        });
        setShowForm(true);
    };

    const resetFilters = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
    };



    // Recent Transactions (Top 10 sorted by date desc)
    const recentTransactions = [...activities]
        .filter(a => {
            if (filterCategory && a.category !== filterCategory) return false;
            if (filterPaymentMethod && a.payment_method !== filterPaymentMethod) return false;
            if (filterStartDate && a.date < filterStartDate) return false;
            if (filterEndDate && a.date > filterEndDate) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, showAll ? undefined : 10);

    // Only show accounts that have activity
    const activeAccounts = availablePaymentMethods.filter(pm => balances[pm] !== undefined);

    if (!mounted || !user) return null;

    return (
        <div className="p-4 max-w-md mx-auto pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Track Your Expenses</h1>
                    <Link href="/profile" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <span>Welcome back, {user.name}</span>
                        <UserIcon size={14} />
                    </Link>
                </div>
                <div className="flex gap-2">
                    {/* Theme Switcher */}
                    <div className="flex bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-gray-100 dark:bg-gray-700 text-yellow-500' : 'text-gray-400'}`}
                        >
                            <Sun size={16} />
                        </button>
                        <button
                            onClick={() => setTheme('system')}
                            className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-gray-100 dark:bg-gray-700 text-blue-500' : 'text-gray-400'}`}
                        >
                            <Laptop size={16} />
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700 text-purple-500' : 'text-gray-400'}`}
                        >
                            <Moon size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingActivityId(null);
                            setNewTransaction({
                                date: new Date().toISOString().split('T')[0],
                                transaction: '',
                                amount: 0,
                                transaction_flow: 'Outflow',
                                payment_method: availablePaymentMethods[0] || '',
                                category: availableCategories[0] || ''
                            });
                            setShowForm(true);
                        }}
                        className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition active:scale-95"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </header>

            {/* Recent Transactions (Last 10) */}
            <section className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className={`text-sm font-medium flex items-center gap-1 transition-colors ${filterCategory || filterPaymentMethod || filterStartDate || filterEndDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <Filter size={16} />
                        </button>
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center"
                        >
                            {showAll ? 'Show Less' : 'View All'} <ChevronRight size={16} className={`transition-transform ${showAll ? 'rotate-90' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filter Menu */}
                {showFilterMenu && (
                    <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filter Transactions</h3>
                            <button onClick={() => setShowFilterMenu(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500"
                                >
                                    <option value="">All Categories</option>
                                    {availableCategories.map(c => (
                                        <option key={c} value={c}>{capitalize(c)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
                                <select
                                    value={filterPaymentMethod}
                                    onChange={(e) => setFilterPaymentMethod(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500"
                                >
                                    <option value="">All Methods</option>
                                    {availablePaymentMethods.map(pm => (
                                        <option key={pm} value={pm}>{capitalize(pm)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To</label>
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        {(filterCategory || filterPaymentMethod || filterStartDate || filterEndDate) && (
                            <button
                                onClick={() => {
                                    setFilterCategory('');
                                    setFilterPaymentMethod('');
                                    setFilterStartDate('');
                                    setFilterEndDate('');
                                }}
                                className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        )}
                    </div>
                )}

                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300 ${showAll ? 'max-h-[400px] overflow-y-auto' : 'overflow-hidden'}`}>
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading transactions...</div>
                    ) : recentTransactions.length > 0 ? (
                        recentTransactions.map((activity, index) => (
                            <div
                                key={activity.id}
                                onClick={() => handleEditClick(activity)}
                                className={`flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index !== recentTransactions.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Icon Removed as requested */}
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.transaction}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.date)}</span>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-medium">{capitalize(activity.category)}</span>
                                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-medium">{capitalize(activity.payment_method)}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${activity.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatCurrency(activity.amount)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400">No transactions yet</div>
                    )}
                </div>
            </section >

            {/* Date Filter */}
            < section className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300" >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        <Calendar size={16} />
                        <span>Period</span>
                    </div>
                    <button
                        onClick={resetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                </div>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </section >

            {/* Period Summary (By Category) */}
            < section className="mb-8" >
                <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Period Summary</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Beginning</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(summary.beginningBalance)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Net Amount</p>
                            <p className={`text-lg font-bold ${(summary.endingBalance - summary.beginningBalance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(summary.endingBalance - summary.beginningBalance)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ending</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.endingBalance)}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase">Category Breakdown</h3>
                        {categorySummary.length > 0 ? (
                            categorySummary.map((item) => (
                                <div key={item.category} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${item.amount > 0 ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{capitalize(item.category)}</span>
                                    </div>
                                    <span className={`text-sm font-semibold ${item.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(item.amount)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-2">No expenses in this period</p>
                        )}
                    </div>
                </div>
            </section >

            {/* Account Cards (Moved to Bottom) */}
            < section className="mb-8" >
                <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Accounts</h2>
                <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {availablePaymentMethods.map((pm) => (
                        <div key={pm} className="w-[140px] p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-24 shrink-0 transition-colors duration-300">
                            <div className="flex items-start justify-between">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Wallet size={16} />
                                </div>
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Active</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mb-0.5">{capitalize(pm)}</p>
                                <p className={`text-base font-bold ${balances[pm] < 0 ? 'text-red-600 dark:text-red-400' : balances[pm] > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>
                                    {formatCurrency(Math.abs(balances[pm] || 0))}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section >

            {/* Transaction Form Modal */}
            {
                showForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editingActivityId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                                <div className="flex items-center gap-3">
                                    {editingActivityId && (
                                        <button
                                            onClick={() => handleDeleteTransaction(editingActivityId)}
                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Flow Toggle */}
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                    <button
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTransaction.transaction_flow === 'Outflow' ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                        onClick={() => setNewTransaction({ ...newTransaction, transaction_flow: 'Outflow' })}
                                    >
                                        Out-flow
                                    </button>
                                    <button
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTransaction.transaction_flow === 'Inflow' ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                        onClick={() => setNewTransaction({ ...newTransaction, transaction_flow: 'Inflow' })}
                                    >
                                        In-flow
                                    </button>
                                </div>

                                {/* Amount & Date Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount</label>
                                        <div className="relative">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold ${newTransaction.transaction_flow === 'Inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>$</span>
                                            <input
                                                type="number"
                                                className={`w-full pl-8 p-3 border rounded-xl text-lg font-bold outline-none focus:ring-2 bg-white dark:bg-gray-700 ${newTransaction.transaction_flow === 'Inflow' ? 'text-green-600 dark:text-green-400 focus:ring-green-100 border-green-200 dark:border-green-800' : 'text-red-600 dark:text-red-400 focus:ring-red-100 border-red-200 dark:border-red-800'}`}
                                                value={newTransaction.amount || ''}
                                                onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 h-[54px] bg-white dark:bg-gray-700 dark:text-white"
                                            value={newTransaction.date}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
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
                                        value={newTransaction.transaction}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, transaction: e.target.value })}
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                        value={newTransaction.category}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                    >
                                        {availableCategories.map(c => (
                                            <option key={c} value={c}>{capitalize(c)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                        value={newTransaction.payment_method}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, payment_method: e.target.value })}
                                    >
                                        {availablePaymentMethods.map(pm => (
                                            <option key={pm} value={pm}>{capitalize(pm)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleSaveTransaction}
                                        disabled={submitting}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Saving...
                                            </>
                                        ) : (
                                            editingActivityId ? 'Update Transaction' : 'Save Transaction'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
