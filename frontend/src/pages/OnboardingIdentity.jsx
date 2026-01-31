import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const OnboardingIdentity = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [legalName, setLegalName] = useState('');
    const [stageName, setStageName] = useState('');
    const [modelEmail, setModelEmail] = useState('');
    const [userId, setUserId] = useState(null);

    // Fetch initial data
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/login');
                return;
            }

            setUserId(user.id);
            setModelEmail(user.email); // Default to auth email

            // Fetch profile created by Trigger
            const { data: profile } = await supabase
                .from('profiles')
                .select('legal_name, stage_name, is_onboarding_complete')
                .eq('id', user.id)
                .single();

            if (profile) {
                if (profile.is_onboarding_complete) {
                    navigate('/dashboard'); // Already done
                }
                setLegalName(profile.legal_name || '');
                setStageName(profile.stage_name || profile.legal_name || ''); // Default stage name to legal name
            } else {
                // Fallback if trigger hasn't fired yet or failed (should be rare)
                setLegalName(user.user_metadata?.full_name || 'New User');
                setStageName(user.user_metadata?.full_name || '');
            }
            setLoading(false);
        };

        fetchProfile();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    stage_name: stageName,
                    model_email: modelEmail,
                    is_onboarding_complete: true
                })
                .eq('id', userId);

            if (error) throw error;

            // Success -> Dashboard
            navigate('/dashboard');
        } catch (error) {
            console.error('Onboarding failed:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-studio-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-studio-black text-white flex flex-col justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto space-y-8">

                {/* Header */}
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mx-auto h-20 w-20 bg-studio-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-studio-gold/30"
                    >
                        <ShieldCheck size={40} className="text-studio-gold" />
                    </motion.div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        Create Your <span className="text-studio-gold">Model Identity</span>
                    </h2>
                    <p className="mt-4 text-gray-400">
                        We separate your <strong>Private Identity</strong> (Legal Name) from your <strong>Public Identity</strong> (Stage Name) for your safety.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Legal Name (Read Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                Private Legal Name (Not Shared)
                            </label>
                            <input
                                type="text"
                                disabled
                                value={legalName}
                                className="block w-full px-4 py-3 bg-black/50 border border-white/5 rounded-lg text-gray-400 cursor-not-allowed"
                            />
                        </div>

                        {/* Stage Name */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Stage Name (Seen by Agencies)
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={stageName}
                                    onChange={(e) => setStageName(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 text-white placeholder-gray-500 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors"
                                    placeholder="e.g. Bella Hadid"
                                />
                            </div>
                        </div>

                        {/* Model Email */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Professional Model Email
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={modelEmail}
                                    onChange={(e) => setModelEmail(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 text-white placeholder-gray-500 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors"
                                    placeholder="contact@example.com"
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Agencies will use this email to contact you directly.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-black bg-studio-gold hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-studio-gold transition-all transform hover:scale-[1.02]"
                        >
                            {submitting ? 'Setting up...' : 'Complete Profile'} <ArrowRight size={18} />
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingIdentity;
