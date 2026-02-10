import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Calendar, Smartphone, Save, Loader2, FileText, Mail, History as HistoryIcon, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import DeleteAccountZone from './DeleteAccountZone';
import EmailChangeModal from './EmailChangeModal';

const ProfileEditor = ({ userId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setEmailModalOpen] = useState(false);
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
        bio: '',
        height_cm: '',
        bust_cm: '',
        waist_cm: '',
        hips_cm: '',
        shoe_size_uk: '',
        eye_color: '',
        hair_color: ''
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
                        bio: profile.bio || '',
                        height_cm: profile.height_cm || '',
                        bust_cm: profile.bust_cm || '',
                        waist_cm: profile.waist_cm || '',
                        hips_cm: profile.hips_cm || '',
                        shoe_size_uk: profile.shoe_size_uk || '',
                        eye_color: profile.eye_color || '',
                        hair_color: profile.hair_color || ''
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
                    email: formData.email,
                    legal_name: formData.legal_name,
                    stage_name: formData.stage_name,
                    date_of_birth: formData.date_of_birth,
                    gender: formData.gender,
                    phone_number: formData.phone_number,
                    bio: formData.bio,
                    height_cm: formData.height_cm || null,
                    bust_cm: formData.bust_cm || null,
                    waist_cm: formData.waist_cm || null,
                    hips_cm: formData.hips_cm || null,
                    shoe_size_uk: formData.shoe_size_uk || null,
                    eye_color: formData.eye_color,
                    hair_color: formData.hair_color
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

                {/* Contact Info & Legal Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Email Address</label>
                            <button
                                type="button"
                                onClick={() => setEmailModalOpen(true)}
                                className="text-[10px] font-bold text-brand-start hover:underline"
                            >
                                Change Login Email
                            </button>
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-brand-start" size={18} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Contact email for agencies"
                                className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 ml-2">This is your public contact email. To change your login email, click the link above.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Legal Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-brand-start" size={18} />
                            <input
                                type="text"
                                name="legal_name"
                                value={formData.legal_name}
                                onChange={handleChange}
                                className="block w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 pl-10 text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
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

                <div className="border-t border-gray-100 dark:border-white/5 my-6"></div>

                {/* Model Stats Section */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary-light dark:text-white">
                        <span className="bg-brand-start/10 text-brand-start p-1 rounded-lg"><User size={16} /></span>
                        Model Stats (Optional)
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Height */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Height (cm)</label>
                            <input
                                type="number"
                                name="height_cm"
                                value={formData.height_cm}
                                onChange={handleChange}
                                placeholder="175"
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                        </div>

                        {/* Shoe Size */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Shoe Size (UK)</label>
                            <input
                                type="number"
                                step="0.5"
                                name="shoe_size_uk"
                                value={formData.shoe_size_uk}
                                onChange={handleChange}
                                placeholder="6.5"
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                        </div>

                        {/* Bust */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Bust (cm)</label>
                            <input
                                type="number"
                                name="bust_cm"
                                value={formData.bust_cm}
                                onChange={handleChange}
                                placeholder="86"
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                        </div>

                        {/* Waist */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Waist (cm)</label>
                            <input
                                type="number"
                                name="waist_cm"
                                value={formData.waist_cm}
                                onChange={handleChange}
                                placeholder="60"
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                        </div>

                        {/* Hips */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Hips (cm)</label>
                            <input
                                type="number"
                                name="hips_cm"
                                value={formData.hips_cm}
                                onChange={handleChange}
                                placeholder="90"
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                            />
                        </div>

                        {/* Eye Color */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Eye Color</label>
                            <select
                                name="eye_color"
                                value={formData.eye_color}
                                onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors appearance-none"
                            >
                                <option value="">Select</option>
                                <option value="Blue">Blue</option>
                                <option value="Brown">Brown</option>
                                <option value="Green">Green</option>
                                <option value="Hazel">Hazel</option>
                                <option value="Grey">Grey</option>
                                <option value="Amber">Amber</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Hair Color */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark mb-1">Hair Color</label>
                            <select
                                name="hair_color"
                                value={formData.hair_color}
                                onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-2 px-3 text-sm text-text-primary-light dark:text-white focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors appearance-none"
                            >
                                <option value="">Select</option>
                                <option value="Blonde">Blonde</option>
                                <option value="Brown">Brown</option>
                                <option value="Black">Black</option>
                                <option value="Red">Red</option>
                                <option value="Grey">Grey</option>
                                <option value="White">White</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
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
            </div>

            {/* Danger Zone */}
            <DeleteAccountZone userId={userId} />

            {/* Modals */}
            <EmailChangeModal
                isOpen={isEmailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                currentEmail={formData.email}
            />
        </motion.div>
    );
};

export default ProfileEditor;
