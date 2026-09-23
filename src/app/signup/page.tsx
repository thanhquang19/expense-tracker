'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';

function signupErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/email-already-in-use') return 'Email already registered';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address';
    return 'An unexpected error occurred';
}

export default function Signup() {
    const router = useRouter();
    const { setUser } = useUser();
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'' | 'error' | 'success'>('');
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsPending(true);

        let createdFirebaseUid: string | null = null;
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            createdFirebaseUid = credential.user.uid;

            // 1. Create the app-side profile row linked to the new Firebase account
            const { data: newUser, error: insertError } = await supabase
                .from('user')
                .insert([{ user_name: userName, user_email: email, firebase_uid: credential.user.uid }])
                .select()
                .single();

            if (insertError) {
                // Roll back the Firebase account so the email/username can be retried
                await credential.user.delete().catch(() => { });
                setMessageType('error');
                setMessage(insertError.code === '23505' ? 'Username already taken' : 'Failed to create account. Please try again.');
                return;
            }

            // 2. Seed default "Cash" payment method
            const { error: seedError } = await supabase
                .from('payment_method')
                .insert([{ payment_method: 'Cash', belong_to: newUser.id }]);

            if (seedError) {
                console.error('Error seeding default account:', seedError);
                // Continue anyway, it's not fatal for signup success
            }

            setUser({ id: newUser.id, name: userName, email, firebaseUid: credential.user.uid });
            setMessageType('success');
            setMessage('Account created successfully! Redirecting...');
            setTimeout(() => router.push('/'), 1000);
        } catch (error) {
            console.error('Signup failed:', error);
            if (createdFirebaseUid) {
                await auth.currentUser?.delete().catch(() => { });
            }
            setMessageType('error');
            setMessage(signupErrorMessage(error));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create Account</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Join us to track your expenses</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" htmlFor="user_name">
                            Username
                        </label>
                        <input
                            type="text"
                            id="user_name"
                            name="user_name"
                            required
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
                            placeholder="johndoe"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" htmlFor="user_email">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="user_email"
                            name="user_email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
                            placeholder="john@example.com"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message */}
                    {message && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${messageType === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Creating Account...
                            </>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
}
