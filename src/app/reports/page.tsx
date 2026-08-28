'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Reports from '@/components/Reports';
import { useUser } from '@/components/UserContext';

export default function ReportsPage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Reports />
        </main>
    );
}
