export interface User {
    id: number;
    user_name: string;
    user_email: string;
}

export interface PaymentMethod {
    id: number;
    payment_method: string;
}

export interface Category {
    id: number;
    category: string;
    type: 'Expense' | 'Income';
}

export interface Activity {
    id: number;
    date: string;
    transaction: string;
    amount: number;
    category: string;
    transaction_flow: 'Inflow' | 'Outflow';
    payment_method: string;
    created_at: string;
    user_id: number;
    recurring_id?: number | null;
}

export type ShoppingCategory = 'grocery' | 'large_item';

export interface ShoppingListItem {
    id: number;
    user_id: number;
    name: string;
    quantity: number;
    category: ShoppingCategory;
    price: number | null;
    is_purchased: boolean;
    created_at: string;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
    id: number;
    user_id: number;
    transaction: string;
    amount: number;
    category: string;
    transaction_flow: 'Inflow' | 'Outflow';
    payment_method: string;
    frequency: RecurringFrequency;
    start_date: string;
    next_run_date: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
}
