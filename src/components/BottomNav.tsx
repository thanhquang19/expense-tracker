'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart } from 'lucide-react';

const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/reports', label: 'Reports', icon: PieChart }
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto flex">
                {tabs.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Icon size={20} />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
