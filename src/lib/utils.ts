import { Activity, RecurringFrequency } from '@/types';

// Balance per payment method; pass asOfDate to only include activity up to (and including) that date
export const getBalances = (activities: Activity[], asOfDate?: Date) => {
    const balances: Record<string, number> = {};

    activities.forEach(activity => {
        if (asOfDate && parseLocalDate(activity.date) > asOfDate) return;

        const { payment_method, amount } = activity;
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

// Parses a YYYY-MM-DD string as a local date (avoids the UTC shift `new Date(str)` applies)
export const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Total spend per expense category across all activities, sorted biggest-first
export const getExpenseCategoryTotals = (activities: Activity[]) => {
    const totals: Record<string, number> = {};
    activities.forEach(a => {
        if (a.amount >= 0) return;
        totals[a.category] = (totals[a.category] || 0) + Math.abs(a.amount);
    });
    return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
};

// Monthly spend per selected category between startDate and endDate (inclusive)
export const getCategoryTrend = (activities: Activity[], startDate: Date, endDate: Date, categories: string[]) => {
    const buckets: { year: number; month: number; label: string }[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastBucket = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cursor <= lastBucket) {
        buckets.push({
            year: cursor.getFullYear(),
            month: cursor.getMonth(),
            label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    const expenses = activities.filter(a => {
        if (a.amount >= 0 || !categories.includes(a.category)) return false;
        const d = parseLocalDate(a.date);
        return d >= rangeStart && d <= rangeEnd;
    });

    const data = buckets.map(bucket => {
        const row: Record<string, number | string> = { month: bucket.label };
        categories.forEach(cat => { row[cat] = 0; });
        return row;
    });

    expenses.forEach(a => {
        const d = parseLocalDate(a.date);
        const bucketIndex = buckets.findIndex(b => b.year === d.getFullYear() && b.month === d.getMonth());
        if (bucketIndex === -1) return;
        (data[bucketIndex][a.category] as number) += Math.abs(a.amount);
    });

    return { data };
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Create date focusing on YYYY-MM-DD components to treat as local date
    const [year, month, day] = dateString.split('-').map(Number);
    // Note: Month is 0-indexed in JS Date
    const date = new Date(year, month - 1, day);
    // Pin locale/format so display doesn't vary by browser locale
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Formats a Date as YYYY-MM-DD using local time (avoids toISOString's UTC shift)
export const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Advances a date to the start of the next recurrence period for the given frequency
export const getNextOccurrence = (date: Date, frequency: RecurringFrequency): Date => {
    const next = new Date(date);
    switch (frequency) {
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
    }
    return next;
};

// Snaps a date back to the start of the calendar period it falls in. Used as the "entry"
// date: the point at which a recurring rule becomes due and its activity gets created,
// e.g. the 1st of the month (or the Sunday of the week) rather than the actual pay date.
export const getPeriodStart = (date: Date, frequency: RecurringFrequency): Date => {
    switch (frequency) {
        case 'monthly':
            return new Date(date.getFullYear(), date.getMonth(), 1);
        case 'yearly':
            return new Date(date.getFullYear(), 0, 1);
        case 'weekly':
        case 'biweekly': {
            const start = new Date(date);
            start.setDate(date.getDate() - date.getDay());
            return start;
        }
    }
};

// Computes the actual transaction (effective) date within the period that starts at
// periodStart, preserving the day-of-month/weekday from the rule's original anchor date.
// E.g. an anchor of the 15th produces Oct 15 for the period that starts Oct 1.
export const getEffectiveDate = (periodStart: Date, anchorDate: Date, frequency: RecurringFrequency): Date => {
    switch (frequency) {
        case 'monthly': {
            const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
            const day = Math.min(anchorDate.getDate(), daysInMonth);
            return new Date(periodStart.getFullYear(), periodStart.getMonth(), day);
        }
        case 'yearly': {
            const month = anchorDate.getMonth();
            const daysInMonth = new Date(periodStart.getFullYear(), month + 1, 0).getDate();
            const day = Math.min(anchorDate.getDate(), daysInMonth);
            return new Date(periodStart.getFullYear(), month, day);
        }
        case 'weekly':
        case 'biweekly': {
            const effective = new Date(periodStart);
            effective.setDate(periodStart.getDate() + anchorDate.getDay());
            return effective;
        }
    }
};

