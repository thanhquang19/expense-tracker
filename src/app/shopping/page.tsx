'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, ShoppingCart, Package } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { ShoppingListItem, ShoppingCategory } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
    fetchShoppingListItems,
    addShoppingListItem,
    updateShoppingListItem,
    deleteShoppingListItem
} from '@/lib/api';
import BottomNav from '@/components/BottomNav';

interface ShoppingSectionProps {
    title: string;
    icon: React.ElementType;
    items: ShoppingListItem[];
    expanded: boolean;
    showPrice?: boolean;
    onToggleExpand: () => void;
    onAddItem: (name: string, price: number | null) => void;
    onTogglePurchased: (item: ShoppingListItem) => void;
    onDelete: (id: number) => void;
}

function ShoppingSection({ title, icon: Icon, items, expanded, showPrice, onToggleExpand, onAddItem, onTogglePurchased, onDelete }: ShoppingSectionProps) {
    const [newItem, setNewItem] = useState('');
    const [newPrice, setNewPrice] = useState('');

    const handleAdd = () => {
        const trimmed = newItem.trim();
        if (!trimmed) return;
        const parsedPrice = newPrice.trim() ? Number(newPrice) : null;
        onAddItem(trimmed, parsedPrice);
        setNewItem('');
        setNewPrice('');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between p-4"
            >
                <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                    <Icon size={18} />
                    {title}
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({items.length})</span>
                </div>
                {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                            placeholder="Add item..."
                            className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        />
                        {showPrice && (
                            <input
                                type="number"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                                placeholder="Price"
                                className="w-24 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            />
                        )}
                        <button
                            onClick={handleAdd}
                            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No items yet.</p>
                    ) : (
                        <ul className="space-y-1">
                            {items.map(item => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.is_purchased}
                                        onChange={() => onTogglePurchased(item)}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    <span className={`flex-1 text-sm ${item.is_purchased ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                                        {item.name}
                                    </span>
                                    {showPrice && item.price != null && (
                                        <span className={`text-sm font-medium ${item.is_purchased ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {formatCurrency(item.price)}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => onDelete(item.id)}
                                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ShoppingPage() {
    const { user, loading: loadingUser } = useUser();
    const router = useRouter();
    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [groceryExpanded, setGroceryExpanded] = useState(true);
    const [largeExpanded, setLargeExpanded] = useState(true);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await fetchShoppingListItems(user.id);
            setItems(data);
        } catch (error) {
            console.error('Failed to load shopping list', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!loadingUser && !user) {
            router.push('/login');
            return;
        }
        loadData();
    }, [user, loadingUser, router, loadData]);

    const handleAddItem = async (name: string, category: ShoppingCategory, price: number | null) => {
        if (!user) return;
        try {
            const created = await addShoppingListItem({ name, category, quantity: 1, price, is_purchased: false, user_id: user.id });
            setItems(prev => [...prev, created]);
        } catch (error) {
            console.error('Failed to add shopping list item', error);
            alert('Failed to add item. Please try again.');
        }
    };

    const handleTogglePurchased = async (item: ShoppingListItem) => {
        try {
            const updated = await updateShoppingListItem(item.id, { is_purchased: !item.is_purchased });
            setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        } catch (error) {
            console.error('Failed to update shopping list item', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteShoppingListItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error('Failed to delete shopping list item', error);
        }
    };

    if (loadingUser || !user) return null;

    const groceryItems = items.filter(i => i.category === 'grocery');
    const largeItems = items.filter(i => i.category === 'large_item');

    return (
        <div className="p-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300">
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex-1">Shopping List</h1>
            </header>

            {loading ? (
                <p className="text-center text-gray-400 dark:text-gray-500 mt-10">Loading...</p>
            ) : (
                <div className="space-y-4">
                    <ShoppingSection
                        title="Grocery"
                        icon={ShoppingCart}
                        items={groceryItems}
                        expanded={groceryExpanded}
                        onToggleExpand={() => setGroceryExpanded(v => !v)}
                        onAddItem={(name) => handleAddItem(name, 'grocery', null)}
                        onTogglePurchased={handleTogglePurchased}
                        onDelete={handleDelete}
                    />
                    <ShoppingSection
                        title="Others"
                        icon={Package}
                        items={largeItems}
                        expanded={largeExpanded}
                        showPrice
                        onToggleExpand={() => setLargeExpanded(v => !v)}
                        onAddItem={(name, price) => handleAddItem(name, 'large_item', price)}
                        onTogglePurchased={handleTogglePurchased}
                        onDelete={handleDelete}
                    />
                </div>
            )}

            <BottomNav />
        </div>
    );
}
