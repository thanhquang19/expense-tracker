import { Activity } from '@/types';

export const getBalances = (activities: Activity[]) => {
    const balances: Record<string, number> = {};

    activities.forEach(activity => {
        const { payment_method, amount, transaction_flow } = activity;
        if (balances[payment_method] === undefined) {
            balances[payment_method] = 0;
        }

        balances[payment_method] += amount;
    });

    return balances;
};

export const getPeriodSummary = (activities: Activity[], startDate: Date, endDate: Date) => {
    // Filter activities within the period
    const periodActivities = activities.filter(a => {
        const d = new Date(a.date);
        // Reset times for accurate date comparison
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

        return dTime >= startTime && dTime <= endTime;
    });

    // Calculate beginning balance (sum of all activities BEFORE startDate)
    const previousActivities = activities.filter(a => {
        const d = new Date(a.date);
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        return dTime < startTime;
    });

    const beginningBalance = previousActivities.reduce((acc, curr) => {
        return acc + curr.amount;
    }, 0);

    // Calculate period flow
    const periodFlow = periodActivities.reduce((acc, curr) => {
        return acc + curr.amount;
    }, 0);

    const endingBalance = beginningBalance + periodFlow;

    return {
        beginningBalance,
        endingBalance,
        activities: periodActivities
    };
};

export const getCategorySummary = (activities: Activity[]) => {
    const summary: Record<string, number> = {};

    activities.forEach(activity => {
        // Include all categories (Income and Expense)
        if (!summary[activity.category]) {
            summary[activity.category] = 0;
        }

        summary[activity.category] += activity.amount;
    });

    return Object.entries(summary)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
};

export const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};
