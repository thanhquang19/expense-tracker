import { supabase } from './supabase';
import { Activity } from '@/types';

const isSupabaseConfigured = () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

export const fetchActivities = async (userId?: number): Promise<Activity[]> => {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return [];
    }

    let query = supabase
        .from('activity')
        .select('*')
        .order('date', { ascending: false });

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }

    return data as Activity[];
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('activity')
        .insert([activity])
        .select()
        .single();

    if (error) {
        console.error('Error adding activity:', error);
        console.error('Error Details:', error.message, error.details, error.hint);
        throw error;
    }

    return data as Activity;
};

export const fetchCategories = async (): Promise<string[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const { data, error } = await supabase
        .from('category')
        .select('category')
        .order('category');

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }

    return data.map((c: any) => c.category);
};

export const fetchPaymentMethods = async (userId?: number): Promise<string[]> => {
    if (!isSupabaseConfigured()) {
        return [];
    }

    let query = supabase
        .from('payment_method')
        .select('payment_method')
        .order('payment_method');

    if (userId) {
        query = query.eq('belong_to', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
    }

    return data.map((pm: any) => pm.payment_method);
};
