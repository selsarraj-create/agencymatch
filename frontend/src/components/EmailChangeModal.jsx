import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmailChangeModal = ({ isOpen, onClose, currentEmail }) => {
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (newEmail === currentEmail) {
                throw new Error("New email must be different from current email.");
            }

            const { data, error } = await supabase.auth.updateUser({ email: newEmail });

            if (error) throw error;

            setSuccess(true);
            setNewEmail('');
        } catch (err) {
            console.error("Email update error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-card-dark rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10"
            >
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary-light dark:text-white">
                        <Mail className="text-brand-start" /> Change Login Email
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-text-primary-light dark:text-white">Check Your Inbox!</h4>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                To secure your account, we've sent a confirmation link to <strong>both</strong> your old and new email addresses.
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl text-left flex gap-3 text-xs text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>You must click the links in <strong>BOTH</strong> emails to finalize the change.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl font-bold text-text-primary-light dark:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdateEmail} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Current Email</label>
                                    <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark text-sm border border-transparent">
                                        {currentEmail}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">New Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="enter@new-email.com"
                                        className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 text-sm rounded-xl border border-red-100 dark:border-red-900/30 text-center">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl font-bold text-text-primary-light dark:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !newEmail}
                                    className="flex-1 py-3 bg-brand-start hover:bg-brand-mid text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update Email'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default EmailChangeModal;
