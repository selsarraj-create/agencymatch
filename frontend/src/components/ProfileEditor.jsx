import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Calendar, Smartphone, Save, Loader2, FileText, Mail, History as HistoryIcon, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import DeleteAccountZone from './DeleteAccountZone';

const ProfileEditor = ({ userId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Transaction History State
    const [transactions, setTransactions] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        stage_name: '',
        legal_name: '', // Read only usually, but let's see
        email: '', // Read only
        date_of_birth: '',
        gender: '',
        phone_number: '',
        bio: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                if (profile) {
                    setFormData({
                        stage_name: profile.stage_name || '',
                        legal_name: profile.legal_name || '',
                        email: profile.email || '',
                        date_of_birth: profile.date_of_birth || '',
                        gender: profile.gender || '',
                        phone_number: profile.phone_number || '',
                        bio: profile.bio || ''
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchTransactions = async () => {
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20); // Last 20 transactions

                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setHistoryLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
            fetchTransactions();
        }
    }, [userId]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    stage_name: formData.stage_name,
                    date_of_birth: formData.date_of_birth,
                    gender: formData.gender,
                    phone_number: formData.phone_number,
                    bio: formData.bio
                })
                .eq('id', userId);

            if (error) throw error;

            alert("Profile updated successfully!");
            if (onUpdate) onUpdate(); // Notify parent to refresh if needed
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-start" size={32} /></div>;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-light dark:bg-card-dark rounded-3xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm"
        >
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <User className="text-brand-start" /> Edit Profile
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

                {/* Read Only Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Email (Read Only)</label>
                        <div className="relative opacity-70">
                            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={formData.email}
                                disabled
                                className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 py-3 pl-10 text-text-primary-light dark:text-white cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Legal Name (Read Only)</label>
                        <div className="relative opacity-70">
                            <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={formData.legal_name}
                                disabled
                                className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 py-3 pl-10 text-text-primary-light dark:text-white cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 dark:border-white/5 my-6"></div>

                {/* Editable Fields */}

                {/* Stage Name */}
                <div>
                    <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Stage Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-brand-start" size={18} />
                        <input
                            type="text"
                            name="stage_name"
                            value={formData.stage_name}
                            onChange={handleChange}
                            className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            placeholder="Enter your stage name"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* DOB */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Date of Birth</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-brand-start" size={18} />
                            <input
                                type="date"
                                name="date_of_birth"
                                value={formData.date_of_birth}
                                onChange={handleChange}
                                className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Gender</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors appearance-none"
                        >
                            <option value="">Select Gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-Binary">Non-Binary</option>
                        </select>
                    </div>
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Phone Number</label>
                    <div className="relative">
                        <Smartphone className="absolute left-3 top-3.5 text-brand-start" size={18} />
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            placeholder="+44 7700 900000"
                        />
                    </div>
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Bio / About Me</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3.5 text-brand-start" size={18} />
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="4"
                            className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors resize-none"
                            placeholder="Tell agencies a bit about yourself..."
                        />
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 bg-brand-start hover:bg-brand-mid text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                        type="button"
                        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
                        className="flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 px-8 py-3 rounded-full font-bold transition-all"
                    >
                        Sign Out
                    </button>
                </div>

            </form>

            <div className="border-t border-gray-200 dark:border-white/10 my-8"></div>

            {/* Transaction History Section */}
            <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <HistoryIcon className="text-brand-start" /> Credit History
                </h3>

                {historyLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                        {tx.amount > 0 ? <Plus size={16} /> : <Minus size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-text-primary-light dark:text-white capitalize">{tx.type}</p>
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{tx.description || 'No description'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-text-primary-light dark:text-white'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No transactions yet.
                    </div>
                )}
                )}
            </div>

            {/* Danger Zone */}
            <DeleteAccountZone userId={userId} />
        </motion.div>
    );
};

export default ProfileEditor;
