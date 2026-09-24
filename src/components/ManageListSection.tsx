'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown } from 'lucide-react';
import { titleCase } from '@/lib/utils';

interface ManageListItem {
    id: number;
    name: string;
    isSystem?: boolean;
}

interface ManageListSectionProps {
    title: string;
    items: ManageListItem[];
    addLabel: string;
    defaultOpen?: boolean;
    onAdd: (name: string) => Promise<void>;
    onUpdate: (id: number, name: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

export default function ManageListSection({ title, items, addLabel, defaultOpen = false, onAdd, onUpdate, onDelete }: ManageListSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    // defaultOpen can flip to true after mount (e.g. once the post-signup welcome flow is detected).
    useEffect(() => {
        if (defaultOpen) setIsOpen(true);
    }, [defaultOpen]);
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleAdd = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setAdding(true);
        try {
            await onAdd(trimmed);
            setNewName('');
        } catch (error) {
            console.error(`Failed to add ${title.toLowerCase()}`, error);
            alert(`Failed to add. It may already exist.`);
        } finally {
            setAdding(false);
        }
    };

    const startEditing = (item: ManageListItem) => {
        setEditingId(item.id);
        setEditingName(item.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleUpdate = async (id: number) => {
        const trimmed = editingName.trim();
        if (!trimmed) return;
        setSavingId(id);
        try {
            await onUpdate(id, trimmed);
            setEditingId(null);
            setEditingName('');
        } catch (error) {
            console.error(`Failed to update ${title.toLowerCase()}`, error);
            alert(`Failed to update. It may already exist.`);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Delete this ${title.toLowerCase().replace(/s$/, '')}?`)) return;
        setDeletingId(id);
        try {
            await onDelete(id);
        } catch (error) {
            console.error(`Failed to delete ${title.toLowerCase()}`, error);
            alert(`Failed to delete. It may still be used by existing transactions.`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full flex items-center justify-between"
            >
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
            <div className="mt-3">
            <div className="space-y-2 mb-4">
                {items.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">None added yet.</p>
                )}
                {items.map(item => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2"
                    >
                        {editingId === item.id ? (
                            <>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(item.id)}
                                    autoFocus
                                    className="flex-1 min-w-0 p-1.5 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                />
                                <button
                                    onClick={() => handleUpdate(item.id)}
                                    disabled={savingId === item.id}
                                    className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
                                >
                                    {savingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                </button>
                                <button onClick={cancelEditing} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-gray-200">{titleCase(item.name)}</span>
                                {item.isSystem ? (
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1.5 py-0.5">Default</span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => startEditing(item)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                                        >
                                            {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={addLabel}
                    className="flex-1 min-w-0 p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 bg-white dark:bg-gray-700 dark:text-white text-sm transition-all"
                />
                <button
                    onClick={handleAdd}
                    disabled={adding || !newName.trim()}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                </button>
            </div>
            </div>
            )}
        </div>
    );
}
