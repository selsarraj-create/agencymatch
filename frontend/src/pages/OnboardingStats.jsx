import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';
import OnboardingStepper from '../components/OnboardingStepper';

const OnboardingStats = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);

    // Stats State
    const [formData, setFormData] = useState({
        height_cm: '',
        bust_cm: '',
        waist_cm: '',
        hips_cm: '',
        shoe_size_uk: '',
        city: '',
        nationality: '',
        ethnicity: '',
        dress_size: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setFormData({
                    height_cm: profile.height_cm || '',
                    bust_cm: profile.bust_cm || '',
                    waist_cm: profile.waist_cm || '',
                    hips_cm: profile.hips_cm || '',
                    shoe_size_uk: profile.shoe_size_uk || '',
                    city: profile.city || '',
                    nationality: profile.nationality || '',
                    ethnicity: profile.ethnicity || '',
                    dress_size: profile.dress_size || ''
                });
            }
            setLoading(false);
        };
        fetchProfile();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    height_cm: formData.height_cm || null,
                    bust_cm: formData.bust_cm || null,
                    waist_cm: formData.waist_cm || null,
                    hips_cm: formData.hips_cm || null,
                    shoe_size_uk: formData.shoe_size_uk || null,
                    city: formData.city || null,
                    nationality: formData.nationality || null,
                    ethnicity: formData.ethnicity || null,
                    dress_size: formData.dress_size || null,
                    onboarding_stage: 'complete',
                    is_onboarding_complete: true,
                    credits: 5 // Grant 5 free credits for completing onboarding
                })
                .eq('id', userId);

            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            alert("Failed to save stats. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-white"><Loader2 className="animate-spin text-brand-start" /></div>;

    return (
        <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-white flex flex-col pt-8 px-4 sm:px-6 lg:px-8 pb-12 transition-colors duration-300">
            <OnboardingStepper currentStep="stats" />
            <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center">
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mx-auto h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-500/30"
                    >
                        <Ruler size={32} className="text-blue-500 dark:text-blue-400" />
                    </motion.div>
                    <h2 className="text-3xl font-black tracking-tight text-text-primary-light dark:text-white">Stand Out to Agencies</h2>
                    <p className="mt-4 text-text-secondary-light dark:text-gray-400 font-medium">Agencies filter by specific measurements. Fill these out to see your best matches.</p>
                </div>

                <div className="bg-card-light dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Measurements Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Height (cm)</label>
                                <input
                                    type="number"
                                    name="height_cm"
                                    value={formData.height_cm}
                                    onChange={handleChange}
                                    required
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Bust (cm)</label>
                                <input
                                    type="number"
                                    name="bust_cm"
                                    value={formData.bust_cm}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Waist (cm)</label>
                                <input
                                    type="number"
                                    name="waist_cm"
                                    value={formData.waist_cm}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Hips (cm)</label>
                                <input
                                    type="number"
                                    name="hips_cm"
                                    value={formData.hips_cm}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Shoe Size (UK)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    name="shoe_size_uk"
                                    value={formData.shoe_size_uk}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Dress Size</label>
                                <input
                                    type="text"
                                    name="dress_size"
                                    value={formData.dress_size}
                                    onChange={handleChange}
                                    placeholder="e.g. 8"
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                        </div>

                        {/* Location / Demographics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-white/10">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Nationality</label>
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Ethnicity</label>
                                <select
                                    name="ethnicity"
                                    value={formData.ethnicity}
                                    onChange={handleChange}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 py-3 px-4 focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-colors"
                                >
                                    <option value="">Select...</option>
                                    <option value="Asian">Asian</option>
                                    <option value="Black">Black</option>
                                    <option value="Caucasian">Caucasian</option>
                                    <option value="Hispanic/Latino">Hispanic / Latino</option>
                                    <option value="Middle Eastern">Middle Eastern</option>
                                    <option value="Mixed">Mixed</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-xl text-lg font-black text-black bg-brand-start hover:bg-brand-mid focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-start transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={24} /> : (
                                    <>Find My Agency Matches <ArrowRight size={20} /></>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingStats;
