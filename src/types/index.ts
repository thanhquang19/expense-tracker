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
}
