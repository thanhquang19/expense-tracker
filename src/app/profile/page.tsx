'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/components/UserContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User as UserIcon, Mail, LogOut, Sparkles, X } from 'lucide-react';
import { Category, PaymentMethod } from '@/types';
import {
    fetchCategoriesWithIds,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchPaymentMethodsWithIds,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    updateUserProfile
} from '@/lib/api';
import ManageListSection from '@/components/ManageListSection';

export default function ProfilePage() {
    const { user, setUser, signOut, loading } = useUser();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saved, setSaved] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [showWelcome, setShowWelcome] = useState(false);

    const loadLists = useCallback(async (userId: number) => {
        try {
            const [categoriesData, paymentMethodsData] = await Promise.all([
                fetchCategoriesWithIds(userId),
                fetchPaymentMethodsWithIds(userId)
            ]);
            setCategories(categoriesData);
            setPaymentMethods(paymentMethodsData);
        } catch (error) {
            console.error('Failed to load categories/payment methods', error);
        }
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            setName(user.name);
            setEmail(user.email);
            loadLists(user.id);
        }
    }, [user, loading, router, loadLists]);

    // Just-registered users are sent here with ?welcome=1 to be nudged into personalizing
    // their categories/payment methods instead of only seeing the shared system defaults.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('welcome') === '1') {
            setShowWelcome(true);
            router.replace('/profile');
        }
    }, [router]);

    const handleSave = async () => {
        if (!user) return;
        try {
            await updateUserProfile(user.id, { user_name: name, user_email: user.email });
            setUser({ ...user, name });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save profile', error);
            alert('Failed to save profile. Please try again.');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const handleBack = () => {
        // Direct loads/refreshes leave no in-app history entry for back() to use
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    if (loading || !user) return null;

    return (
        <div className="p-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Edit Profile</h1>
            </header>

            {showWelcome && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-4">
                    <Sparkles size={20} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1 text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-semibold">Welcome! Let&apos;s personalize your account.</p>
                        <p className="mt-1">
                            We&apos;ve added some default categories and a default &quot;Cash&quot; payment method to get you started.
                            Add your own below — they&apos;ll only be visible to you.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowWelcome(false)}
                        className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                        <UserIcon size={40} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your personal details</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <UserIcon size={18} />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 bg-white dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Enter your name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-xl outline-none bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Email is tied to your sign-in account and can't be changed here.</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4"
                >
                    {saved ? (
                        <>
                            <span>Saved!</span>
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>

                <button
                    onClick={handleSignOut}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>

            <div className="space-y-4 mt-4">
                <ManageListSection
                    title="Categories"
                    addLabel="Add new category"
                    defaultOpen={showWelcome}
                    items={categories.map(c => ({ id: c.id, name: c.category, isSystem: c.belong_to == null }))}
                    onAdd={async (name) => {
                        const created = await addCategory(name, user.id);
                        setCategories(prev => [...prev, created].sort((a, b) => a.category.localeCompare(b.category)));
                    }}
                    onUpdate={async (id, name) => {
                        const updated = await updateCategory(id, name);
                        setCategories(prev => prev.map(c => c.id === id ? updated : c).sort((a, b) => a.category.localeCompare(b.category)));
                    }}
                    onDelete={async (id) => {
                        await deleteCategory(id);
                        setCategories(prev => prev.filter(c => c.id !== id));
                    }}
                />

                <ManageListSection
                    title="Payment Methods"
                    addLabel="Add new payment method"
                    defaultOpen={showWelcome}
                    items={paymentMethods.map(p => ({ id: p.id, name: p.payment_method, isSystem: p.belong_to == null }))}
                    onAdd={async (name) => {
                        const created = await addPaymentMethod(name, user.id);
                        setPaymentMethods(prev => [...prev, created].sort((a, b) => a.payment_method.localeCompare(b.payment_method)));
                    }}
                    onUpdate={async (id, name) => {
                        const updated = await updatePaymentMethod(id, name);
                        setPaymentMethods(prev => prev.map(p => p.id === id ? updated : p).sort((a, b) => a.payment_method.localeCompare(b.payment_method)));
                    }}
                    onDelete={async (id) => {
                        await deletePaymentMethod(id);
                        setPaymentMethods(prev => prev.filter(p => p.id !== id));
                    }}
                />
            </div>
        </div>
    );
}

