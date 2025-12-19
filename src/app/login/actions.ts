'use server';

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function login(prevState: any, formData: FormData) {
    const user_email = formData.get('user_email') as string;
    const password = formData.get('password') as string;

    if (!user_email || !password) {
        return { message: 'Email and password are required', type: 'error' };
    }

    try {
        // 1. Find user by email
        const { data: user, error } = await supabase
            .from('user')
            .select('id, user_name, user_email, password')
            .eq('user_email', user_email)
            .single();

        if (error || !user) {
            return { message: 'Invalid email or password', type: 'error' };
        }

        // 2. Verify password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return { message: 'Invalid email or password', type: 'error' };
        }

        // 3. Success (Return user info to client)
        return {
            message: 'Login successful',
            type: 'success',
            user: {
                id: user.id,
                name: user.user_name,
                email: user.user_email
            }
        };

    } catch (error) {
        console.error('Unexpected error:', error);
        return { message: 'An unexpected error occurred', type: 'error' };
    }
}
