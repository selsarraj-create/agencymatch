import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import SocialAuthButtons from '../components/SocialAuthButtons';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/admin');
        }
    };

    return (
        <div className="min-h-screen bg-studio-black flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-studio-gold/20 mb-4 text-studio-gold">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
                    <p className="text-gray-400 text-sm">Sign in to view leads</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-studio-gold transition-colors"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-studio-gold transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-studio-gold hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-studio-black px-2 text-gray-500">Or continue with social</span>
                        </div>
                    </div>
                    {/* Lazy Import or direct usage. We assume import at top */}
                    <SocialAuthButtons />
                </div>
            </div>
        </div>
    );
};

export default Login;
