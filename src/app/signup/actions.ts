'use server';

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function signup(prevState: any, formData: FormData) {
    const user_name = formData.get('user_name') as string;
    const user_email = formData.get('user_email') as string;
    const password = formData.get('password') as string;

    if (!user_name || !user_email || !password) {
        return { message: 'All fields are required', type: 'error' };
    }

    try {
        // 1. Check if email exists
        const { data: existingEmail } = await supabase
            .from('user')
            .select('id')
            .eq('user_email', user_email)
            .single();

        if (existingEmail) {
            return { message: 'Email already registered', type: 'error' };
        }

        // 2. Check if username exists
        const { data: existingName } = await supabase
            .from('user')
            .select('id')
            .eq('user_name', user_name)
            .single();

        if (existingName) {
            return { message: 'Username already taken', type: 'error' };
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert user
        const { data: newUser, error: insertError } = await supabase
            .from('user')
            .insert([
                {
                    user_name,
                    user_email,
                    password: hashedPassword,
                }
            ])
            .select() // Select to get ID
            .single();

        if (insertError) {
            console.error('Signup error:', insertError);
            return { message: 'Failed to create account. Please try again.', type: 'error' };
        }

        // 5. Seed default "Cash" payment method
        const { error: seedError } = await supabase
            .from('payment_method')
            .insert([
                {
                    payment_method: 'Cash',
                    belong_to: newUser.id
                }
            ]);

        if (seedError) {
            console.error('Error seeding default account:', seedError);
            // Continue anyway, it's not fatal for signup success
        }

        // Success - Return user info
        return {
            message: 'Account created successfully! Redirecting...',
            type: 'success',
            user: {
                id: newUser.id,
                name: user_name,
                email: user_email
            }
        };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { message: 'An unexpected error occurred', type: 'error' };
    }
}
