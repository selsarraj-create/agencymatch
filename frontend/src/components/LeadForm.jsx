import React, { useState } from 'react';
import { Lock, Mail, Key, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import SocialAuthButtons from './SocialAuthButtons';

const LeadForm = ({ analysisData, imageBlob, onSubmitSuccess, onCancel }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Save to LocalStorage for "Handoff" mechanism (works for Social Login redirects too)
        if (analysisData) {
            localStorage.setItem('pending_analysis', JSON.stringify(analysisData));
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;
            if (window.fbq) window.fbq('track', 'CompleteRegistration');

            onSubmitSuccess();
            navigate('/onboarding/profile');

        } catch (err) {
            console.error(err);
            if (err.message.includes("already registered")) {
                setError(<span>Account exists. <a href="/login" className="underline text-brand-start font-bold">Log in</a></span>);
            } else {
                setError(err.message || "Signup failed.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-md transition-opacity">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-card-light dark:bg-card-dark w-full max-w-lg p-6 sm:p-10 rounded-3xl relative shadow-2xl border border-gray-200 dark:border-white/10 transition-colors duration-300">
                    {/* Close Button */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-text-secondary-light dark:text-text-secondary-dark hover:text-black dark:hover:text-white transition-colors p-2 z-50 bg-gray-100 dark:bg-white/5 rounded-full"
                            type="button"
                        >
                            <X size={20} />
                        </button>
                    )}
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-start/10 mb-4 text-brand-start shadow-lg shadow-brand-start/20">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-text-primary-light dark:text-white tracking-tight mb-2">
                            Create Account
                        </h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">
                            Save your scan results to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <SocialAuthButtons />

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm uppercase font-bold tracking-widest">
                                <span className="bg-card-light dark:bg-card-dark px-3 text-gray-400">Or Email</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark font-bold">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-lg text-text-primary-light dark:text-white focus:outline-none focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-all"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark font-bold">Password</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-4 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-lg text-text-primary-light dark:text-white focus:outline-none focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-bold">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 bg-text-primary-light dark:bg-white hover:bg-black/80 dark:hover:bg-gray-200 text-white dark:text-black font-bold py-4 text-lg rounded-full transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl"
                        >
                            {loading ? "Creating..." : "Create Account"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadForm;
