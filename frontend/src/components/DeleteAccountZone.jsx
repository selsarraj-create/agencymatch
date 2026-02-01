import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

const DeleteAccountZone = ({ userId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') return;
        setLoading(true);
        setError(null);

        try {
            // Get current session for the backend verification
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            // Call Backend
            await axios.delete(`${API_URL}/api/delete-account`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            // Sign out on client
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (err) {
            console.error("Delete account error:", err);
            setError("Failed to delete account. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="mt-12 p-6 border border-red-200 dark:border-red-900/30 rounded-3xl bg-red-50/50 dark:bg-red-900/10">
            <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-500" />
                <h3 className="text-lg font-black text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            <button
                onClick={() => setIsOpen(true)}
                className="px-6 py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
            >
                <Trash2 size={18} /> Delete Account
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-card-dark max-w-md w-full rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-white/10">
                        <h2 className="text-2xl font-black text-red-600 mb-4">Delete Account?</h2>

                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6">
                            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                                Warning: This action is permanent. You will lose all credits, analysis data, and uploaded photos immediately.
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Type <span className="font-mono text-red-500">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/20 font-mono tracking-widest text-center uppercase text-black dark:text-white"
                                placeholder="DELETE"
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                                className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={confirmText !== 'DELETE' || loading}
                                className="flex-1 py-3 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} /> Scrubbing data...
                                    </>
                                ) : (
                                    'Confirm Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeleteAccountZone;
