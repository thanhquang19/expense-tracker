'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/components/UserContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User as UserIcon, Mail, LogOut } from 'lucide-react';

export default function ProfilePage() {
    const { user, updateUser, loading } = useUser();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user, loading, router]);

    const handleSave = () => {
        if (!user) return;
        updateUser({ ...user, name, email });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSignOut = () => {
        updateUser(null);
        router.push('/signup');
    };

    if (loading || !user) return null;

    return (
        <div className="p-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Edit Profile</h1>
            </header>

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
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 bg-white dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Enter your email"
                            />
                        </div>
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
        </div>
    );
}
