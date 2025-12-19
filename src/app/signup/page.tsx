'use client';

import { useActionState, useEffect } from 'react';
import { signup } from './actions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';

const initialState = {
    message: '',
    type: '' as '' | 'error' | 'success',
    user: undefined as { id: number, name: string, email: string } | undefined
};

export default function Signup() {
    const [state, formAction, isPending] = useActionState(signup, initialState);
    const router = useRouter();
    const { updateUser } = useUser();

    useEffect(() => {
        if (state.type === 'success' && state.user) {
            // Auto login
            updateUser({
                id: state.user.id,
                name: state.user.name,
                email: state.user.email
            });
            // Redirect after delay
            const timer = setTimeout(() => {
                router.push('/');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [state, router, updateUser]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create Account</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Join us to track your expenses</p>
                </div>

                <form action={formAction} className="space-y-4">
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
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message */}
                    {state?.message && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${state.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-600'}`}>
                            {state.message}
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
