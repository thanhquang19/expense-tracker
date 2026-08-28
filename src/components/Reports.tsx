'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { getPeriodSummary, getCategorySummary, getCategoryTrend, getExpenseCategoryTotals, capitalize, formatCurrency, formatDate, toLocalDateString, parseLocalDate } from '@/lib/utils';
import { Activity } from '@/types';
import { fetchActivities, addActivity, updateActivity, deleteActivity, fetchCategories, fetchPaymentMethods } from '@/lib/api';
import { Calendar, RotateCcw, User as UserIcon, X } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import TransactionModal from '@/components/TransactionModal';

// Stable, rarely-changing categories that don't need to clutter the trend chart by default
const DEFAULT_TREND_EXCLUDED = ['rent', 'saving'];

const SLICE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function Reports() {
    const { user } = useUser();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTrendCategories, setSelectedTrendCategories] = useState<string[] | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

    const now = new Date();
    const firstDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastDay = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    // Independent period for the trend chart (defaults to the trailing 6 months)
    const trendDefaultStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const [trendStartDate, setTrendStartDate] = useState(trendDefaultStart);
    const [trendEndDate, setTrendEndDate] = useState(lastDay);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([fetchActivities(user.id), fetchCategories(), fetchPaymentMethods(user.id)])
            .then(([activitiesData, categoriesData, paymentMethodsData]) => {
                setActivities(activitiesData);
                setAvailableCategories(categoriesData);
                setAvailablePaymentMethods(paymentMethodsData);
            })
            .catch(err => console.error('Failed to load data', err))
            .finally(() => setLoading(false));
    }, [user]);

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

    const handleTransactionClick = (activity: Activity) => {
        setEditingActivity(activity);
        setShowForm(true);
    };

    const resetPeriod = () => {
        const n = new Date();
        setStartDate(toLocalDateString(new Date(n.getFullYear(), n.getMonth(), 1)));
        setEndDate(toLocalDateString(new Date(n.getFullYear(), n.getMonth() + 1, 0)));
    };

    const resetTrendPeriod = () => {
        const n = new Date();
        setTrendStartDate(toLocalDateString(new Date(n.getFullYear(), n.getMonth() - 5, 1)));
        setTrendEndDate(toLocalDateString(new Date(n.getFullYear(), n.getMonth() + 1, 0)));
    };

    const periodActivities = useMemo(() => {
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        end.setHours(23, 59, 59, 999);
        return getPeriodSummary(activities, start, end).activities;
    }, [activities, startDate, endDate]);

    // Spending (expense) breakdown by category for the pie chart
    const spendingByCategory = useMemo(() => {
        return getCategorySummary(periodActivities)
            .filter(item => item.amount < 0)
            .map(item => ({ category: item.category, name: capitalize(item.category), value: Math.abs(item.amount) }))
            .sort((a, b) => b.value - a.value);
    }, [periodActivities]);

    const totalSpending = spendingByCategory.reduce((sum, item) => sum + item.value, 0);

    // Reset the drill-down if the selected category no longer has activity in the period
    useEffect(() => {
        if (selectedCategory && !spendingByCategory.some(item => item.category === selectedCategory)) {
            setSelectedCategory(null);
        }
    }, [spendingByCategory, selectedCategory]);

    const selectedCategoryTransactions = useMemo(() => {
        if (!selectedCategory) return [];
        return periodActivities
            .filter(a => a.category === selectedCategory)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodActivities, selectedCategory]);

    const toggleCategory = (category: string) => {
        setSelectedCategory(prev => (prev === category ? null : category));
    };

    // All expense categories, biggest spend first — used both as the chip list and default trend selection
    const allExpenseCategories = useMemo(() => getExpenseCategoryTotals(activities).map(c => c.category), [activities]);

    // Default the trend chart to the top 5 categories, excluding the stable ones (rent, saving)
    useEffect(() => {
        if (selectedTrendCategories !== null || allExpenseCategories.length === 0) return;
        const defaults = allExpenseCategories
            .filter(c => !DEFAULT_TREND_EXCLUDED.includes(c.toLowerCase()))
            .slice(0, 5);
        setSelectedTrendCategories(defaults);
    }, [allExpenseCategories, selectedTrendCategories]);

    const toggleTrendCategory = (category: string) => {
        setSelectedTrendCategories(prev => {
            const current = prev || [];
            return current.includes(category) ? current.filter(c => c !== category) : [...current, category];
        });
    };

    // Per-category spend trend over the selected trend period
    const categoryTrend = useMemo(() => {
        return getCategoryTrend(activities, parseLocalDate(trendStartDate), parseLocalDate(trendEndDate), selectedTrendCategories || []);
    }, [activities, trendStartDate, trendEndDate, selectedTrendCategories]);

    const tooltipStyle = mounted ? {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '12px'
    } : undefined;

    if (!mounted || !user) return null;

    return (
        <div className="p-4 max-w-md mx-auto pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports</h1>
                    <Link href="/profile" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <span>{user.name}</span>
                        <UserIcon size={14} />
                    </Link>
                </div>
            </header>

            {/* Period Selector */}
            <section className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        <Calendar size={16} />
                        <span>Period</span>
                    </div>
                    <button
                        onClick={resetPeriod}
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
            </section>

            {/* Spending Breakdown Pie Chart */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Spending by Category</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors duration-300">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading...</div>
                    ) : spendingByCategory.length > 0 ? (
                        <>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={spendingByCategory}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            onClick={(entry: any) => toggleCategory(entry.category)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {spendingByCategory.map((item, index) => (
                                                <Cell
                                                    key={item.category}
                                                    fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                                                    fillOpacity={!selectedCategory || item.category === selectedCategory ? 1 : 0.3}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 space-y-1">
                                {spendingByCategory.map((item, index) => (
                                    <div
                                        key={item.name}
                                        onClick={() => toggleCategory(item.category)}
                                        className={`flex justify-between items-center text-sm p-1.5 rounded-lg cursor-pointer transition-colors ${selectedCategory === item.category ? 'bg-gray-100 dark:bg-gray-700/70' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}></div>
                                            <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(item.value)}</span>
                                            <span className="text-xs text-gray-400 w-10 text-right">{totalSpending > 0 ? Math.round((item.value / totalSpending) * 100) : 0}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 italic text-center py-8">No expenses in this period</p>
                    )}
                </div>
            </section>

            {/* Selected Category Transaction Details */}
            {selectedCategory && (
                <section className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{capitalize(selectedCategory)} Transactions</h2>
                        <button onClick={() => setSelectedCategory(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                        {selectedCategoryTransactions.map((activity, index) => (
                            <div
                                key={activity.id}
                                onClick={() => handleTransactionClick(activity)}
                                className={`flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index !== selectedCategoryTransactions.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.transaction}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(activity.date)}</span>
                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-medium">{capitalize(activity.payment_method)}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(activity.amount)}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Spending Trend */}
            <section className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Spending Trend</h2>
                    <button
                        onClick={resetTrendPeriod}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors duration-300">
                    <div className="flex gap-3 mb-4">
                        <input
                            type="date"
                            value={trendStartDate}
                            onChange={(e) => setTrendStartDate(e.target.value)}
                            className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        />
                        <input
                            type="date"
                            value={trendEndDate}
                            onChange={(e) => setTrendEndDate(e.target.value)}
                            className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {allExpenseCategories.map((cat) => {
                            const active = (selectedTrendCategories || []).includes(cat);
                            const colorIndex = allExpenseCategories.indexOf(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => toggleTrendCategory(cat)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'}`}
                                    style={active ? { backgroundColor: SLICE_COLORS[colorIndex % SLICE_COLORS.length] } : undefined}
                                >
                                    {capitalize(cat)}
                                </button>
                            );
                        })}
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading...</div>
                    ) : (selectedTrendCategories || []).length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-8">Select a category above to see its trend</p>
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={categoryTrend.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    {(selectedTrendCategories || []).map((cat) => (
                                        <Line
                                            key={cat}
                                            type="monotone"
                                            dataKey={cat}
                                            name={capitalize(cat)}
                                            stroke={SLICE_COLORS[allExpenseCategories.indexOf(cat) % SLICE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </section>

            <TransactionModal
                isOpen={showForm}
                editingActivity={editingActivity}
                categories={availableCategories}
                paymentMethods={availablePaymentMethods}
                onClose={() => setShowForm(false)}
                onSave={handleSaveActivity}
                onDelete={handleDeleteActivity}
            />
            <BottomNav />
        </div>
    );
}

