'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';

function loginErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return 'Invalid email or password';
    }
    if (code === 'auth/too-many-requests') {
        return 'Too many attempts. Please try again later.';
    }
    return 'An unexpected error occurred';
}

export default function Login() {
    const router = useRouter();
    const { setUser } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsPending(true);
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);

            let { data: profile, error: profileError } = await supabase
                .from('user')
                .select('id, user_name, user_email, firebase_uid')
                .eq('firebase_uid', credential.user.uid)
                .single();

            // First login for a Firebase account created outside the signup flow (e.g. added
            // directly in the Firebase console): claim the matching legacy profile by email.
            if ((profileError || !profile) && credential.user.email) {
                const claimed = await supabase
                    .from('user')
                    .update({ firebase_uid: credential.user.uid })
                    .eq('user_email', credential.user.email)
                    .is('firebase_uid', null)
                    .select('id, user_name, user_email, firebase_uid')
                    .single();
                profile = claimed.data;
                profileError = claimed.error;
            }

            if (profileError || !profile) {
                setMessage('No profile found for this account.');
                return;
            }

            setUser({ id: profile.id, name: profile.user_name, email: profile.user_email, firebaseUid: profile.firebase_uid });
            router.push('/');
        } catch (error) {
            console.error('Login failed:', error);
            setMessage(loginErrorMessage(error));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome Back</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
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
                                Signing In...
                            </>
                        ) : (
                            'Log In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
