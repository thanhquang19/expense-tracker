'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    getBalances,
    getPeriodSummary,
    getCategorySummary,
    capitalize,
    formatCurrency,
    formatDate,
    toLocalDateString,
    parseLocalDate
} from '@/lib/utils';
import { Activity } from '@/types';
import { fetchActivities, addActivity, updateActivity, deleteActivity, fetchCategories, fetchPaymentMethods, processDueRecurringTransactions } from '@/lib/api';
import { Wallet, Plus, Calendar, ChevronRight, ChevronDown, ChevronUp, RotateCcw, Moon, Sun, Laptop, User as UserIcon, Filter, X, Repeat, Camera } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUser } from '@/components/UserContext';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import TransactionModal from '@/components/TransactionModal';

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
    const [showRecentTransactions, setShowRecentTransactions] = useState(true);
    const [showPeriodSummary, setShowPeriodSummary] = useState(false);
    const [showAccounts, setShowAccounts] = useState(false);

    // Filters (category/payment method only — the date range is shared with the Period picker below)
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

    const { theme, setTheme } = useTheme();
    const { user, loading: loadingUser } = useUser();
    const [mounted, setMounted] = useState(false);

    // Date Filters (Default to current month)
    const now = new Date();
    const firstDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [scanShortcut, setScanShortcut] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Backfill any recurring transactions that came due while the app was closed
            try {
                await processDueRecurringTransactions(user.id);
            } catch (error) {
                console.error('Failed to process recurring transactions', error);
            }

            const [activitiesData, categoriesData, paymentMethodsData] = await Promise.all([
                fetchActivities(user.id),
                fetchCategories(user.id),
                fetchPaymentMethods(user.id)
            ]);

            setActivities(activitiesData);
            setAvailableCategories(categoriesData);
            setAvailablePaymentMethods(paymentMethodsData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 2. Calculate Period Summary
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        // Adjust end date to include the full day
        end.setHours(23, 59, 59, 999);

        const periodSummary = getPeriodSummary(activities, start, end);
        setSummary(periodSummary);

        // 3. Calculate Balances (as of the end of the selected period)
        const currentBalances = getBalances(activities, end);
        setBalances(currentBalances);

        // 4. Calculate Category Breakdown (for the period)
        const catSummary = getCategorySummary(periodSummary.activities);
        setCategorySummary(catSummary);

    }, [activities, startDate, endDate]);

    const handleSaveActivity = async (activityData: Omit<Activity, 'id' | 'created_at'>, editingId: number | null) => {
        if (editingId) {
            const updatedActivity = await updateActivity(editingId, activityData);
            setActivities(activities.map(a => a.id === editingId ? updatedActivity : a));
        } else {
            const savedActivity = await addActivity(activityData);
            setActivities([savedActivity, ...activities]);
        }
        setShowForm(false);
        setEditingActivity(null);
    };

    const handleDeleteActivity = async (id: number) => {
        await deleteActivity(id);
        setActivities(activities.filter(a => a.id !== id));
        setShowForm(false);
        setEditingActivity(null);
    };

    const handleEditClick = (activity: Activity) => {
        setEditingActivity(activity);
        setShowForm(true);
    };

    const resetFilters = () => {
        const now = new Date();
        const firstDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
        const lastDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        setStartDate(firstDay);
        setEndDate(lastDay);
    };


    // Calculate running balances for all activities
    const runningBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        const runBalances: Record<number, number> = {};

        // Process from oldest to newest to build up the balance history
        for (let i = activities.length - 1; i >= 0; i--) {
            const activity = activities[i];
            const pm = activity.payment_method;
            balances[pm] = (balances[pm] || 0) + activity.amount;
            runBalances[activity.id] = balances[pm];
        }
        return runBalances;
    }, [activities]);

    // Recent Transactions (Top 10 sorted by date desc), scoped to the selected Period
    const recentTransactions = [...activities]
        .filter(a => {
            if (filterCategory && a.category !== filterCategory) return false;
            if (filterPaymentMethod && a.payment_method !== filterPaymentMethod) return false;
            if (a.date < startDate || a.date > endDate) return false;
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
                            setEditingActivity(null);
                            setScanShortcut(true);
                            setShowForm(true);
                        }}
                        className="p-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition active:scale-95"
                        title="Scan Receipt"
                    >
                        <Camera size={24} />
                    </button>

                    <button
                        onClick={() => {
                            setEditingActivity(null);
                            setShowForm(true);
                        }}
                        className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition active:scale-95"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </header>

            {/* Period (shared date range for Recent Transactions + Period Summary below) */}
            <section className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
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
                <p className="text-xs text-gray-400 mt-2">Applies to the transactions and summary below</p>
            </section>

            {/* Recent Transactions (Last 10) */}
            <section className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <button
                        onClick={() => setShowRecentTransactions(v => !v)}
                        className="flex items-center gap-1"
                    >
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h2>
                        {showRecentTransactions ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>
                    {showRecentTransactions && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`text-sm font-medium flex items-center gap-1 transition-colors ${filterCategory || filterPaymentMethod ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
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
                    )}
                </div>

                {showRecentTransactions && (
                <>
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
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Date range comes from the Period picker below</p>
                        {(filterCategory || filterPaymentMethod) && (
                            <button
                                onClick={() => {
                                    setFilterCategory('');
                                    setFilterPaymentMethod('');
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
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                            {activity.transaction}
                                            {activity.recurring_id && (
                                                <Repeat size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.date)}</span>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-medium">{capitalize(activity.category)}</span>
                                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-medium">{capitalize(activity.payment_method)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${activity.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(activity.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                        {formatCurrency(runningBalances[activity.id] || 0)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400">No transactions yet</div>
                    )}
                </div>
                </>
                )}
            </section >

            {/* Period Summary (By Category) */}
            < section className="mb-8" >
                <button
                    onClick={() => setShowPeriodSummary(v => !v)}
                    className="w-full flex justify-between items-center mb-3"
                >
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Period Summary</h2>
                    {showPeriodSummary ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                {showPeriodSummary && (
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
                                    <div
                                        key={item.category}
                                        className="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors"
                                        onClick={() => {
                                            setFilterCategory(item.category);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    >
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
                )}
            </section >

            {/* Account Cards (Moved to Bottom) */}
            < section className="mb-8" >
                <button
                    onClick={() => setShowAccounts(v => !v)}
                    className="w-full flex justify-between items-center mb-3"
                >
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Accounts</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">as of {formatDate(endDate)}</span>
                        {showAccounts ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                </button>
                {showAccounts && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            {activeAccounts.filter(pm => balances[pm] >= 0).map((pm) => (
                                <div
                                    key={pm}
                                    onClick={() => {
                                        setFilterPaymentMethod(pm);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 cursor-pointer hover:shadow-md"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Wallet size={14} />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{capitalize(pm)}</p>
                                    </div>
                                    <p className="text-sm font-bold text-green-600 dark:text-green-400 text-right">
                                        {formatCurrency(balances[pm] || 0)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {activeAccounts.filter(pm => balances[pm] < 0).map((pm) => (
                                <div
                                    key={pm}
                                    onClick={() => {
                                        setFilterPaymentMethod(pm);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 cursor-pointer hover:shadow-md"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Wallet size={14} />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{capitalize(pm)}</p>
                                    </div>
                                    <p className="text-sm font-bold text-red-600 dark:text-red-400 text-right">
                                        {formatCurrency(Math.abs(balances[pm] || 0))}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section >

            <TransactionModal
                isOpen={showForm}
                editingActivity={editingActivity}
                categories={availableCategories}
                paymentMethods={availablePaymentMethods}
                autoStartScan={scanShortcut}
                onClose={() => {
                    setShowForm(false);
                    setScanShortcut(false);
                }}
                onSave={handleSaveActivity}
                onDelete={handleDeleteActivity}
            />
            <BottomNav />
        </div >
    );
}
