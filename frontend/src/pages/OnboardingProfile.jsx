import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const OnboardingProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [userId, setUserId] = useState(null);
    const [legalName, setLegalName] = useState('');
    const [stageName, setStageName] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [phone, setPhone] = useState('');

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
                if (profile.is_onboarding_complete) {
                    navigate('/dashboard');
                }
                setLegalName(profile.legal_name || '');
                setStageName(profile.stage_name || profile.legal_name || '');
            } else {
                setLegalName(user.user_metadata?.full_name || 'New User');
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
                    date_of_birth: dob,
                    gender: gender,
                    phone_number: phone,
                    is_onboarding_complete: true
                })
                .eq('id', userId);

            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-studio-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-studio-black text-white flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-md w-full mx-auto space-y-8">
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mx-auto h-20 w-20 bg-studio-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-studio-gold/30"
                    >
                        <ShieldCheck size={40} className="text-studio-gold" />
                    </motion.div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Let's build your <span className="text-studio-gold">Agency Card</span></h2>
                    <p className="mt-4 text-gray-400">Complete your profile to get matched with agencies.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Stage Name */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Stage Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={stageName}
                                    onChange={(e) => setStageName(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 text-white placeholder-gray-500 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors"
                                    placeholder={legalName}
                                />
                            </div>
                        </div>

                        {/* DOB */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Date of Birth</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 text-white placeholder-gray-500 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Gender</label>
                            <select
                                required
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 px-4 text-white focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors appearance-none"
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Non-Binary">Non-Binary</option>
                            </select>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">Phone Number</label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 text-white placeholder-gray-500 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold transition-colors"
                                    placeholder="+44 7700 900000"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-black bg-studio-gold hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-studio-gold transition-all transform hover:scale-[1.02]"
                        >
                            {submitting ? 'Saving Profile...' : 'Complete Profile'} <ArrowRight size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OnboardingProfile;
