import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, ExternalLink, CheckCircle, XCircle, Clock, Loader2, Coins } from 'lucide-react';

const ClientDashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [processingPkg, setProcessingPkg] = useState(null);
    const navigate = useNavigate();

    const PACKAGES = [
        { credits: 10, price: '£5.00', amount: 500, id: 10, popular: false },
        { credits: 30, price: '£10.00', amount: 1000, id: 30, popular: true },
        { credits: 50, price: '£15.00', amount: 1500, id: 50, popular: false },
        { credits: 100, price: '£25.00', amount: 2500, id: 100, popular: false },
    ];

    // Handle Buy Credits
    const handleBuyCredits = async (pkgId) => {
        try {
            setProcessingPkg(pkgId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
            const response = await axios.post(`${API_URL}/create-checkout-session`, {
                user_id: user.id,
                amount: pkgId
            });

            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            alert("Failed to start checkout. Please try again.");
            setProcessingPkg(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // 1. Fetch Profile (Credits)
            const profile = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', user.id)
                .single();

            if (profile.data) setCredits(profile.data.credits);

            // 2. Fetch Submissions
            const { data, error } = await supabase
                .from('agency_submissions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setSubmissions(data);
            setLoading(false);

            // 3. Realtime Subscriptions
            const channel = supabase.channel('dashboard_realtime')
                // Listen for Submissions
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'agency_submissions',
                    filter: `user_id=eq.${user.id}`
                }, payload => {
                    handleSubmissionUpdate(payload);
                })
                // Listen for Credit Changes (Profile)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                }, payload => {
                    if (payload.new) {
                        setCredits(payload.new.credits);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        fetchData();
    }, [navigate]);

    const handleSubmissionUpdate = (payload) => {
        if (payload.eventType === 'INSERT') {
            setSubmissions(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
            setSubmissions(prev => prev.map(item =>
                item.id === payload.new.id ? payload.new : item
            ));
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'failed': return <XCircle className="text-red-500" size={20} />;
            case 'processing': return <Loader2 className="animate-spin text-studio-gold" size={20} />;
            default: return <Clock className="text-gray-500" size={20} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-studio-black flex items-center justify-center text-white">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-studio-black p-4 md:p-8 relative">

            {/* Buy Credits Modal */}
            {showBuyModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Coins className="text-studio-gold" /> Top Up Credits
                            </h3>
                            <button onClick={() => setShowBuyModal(false)} className="text-gray-400 hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PACKAGES.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleBuyCredits(pkg.id)}
                                    disabled={!!processingPkg}
                                    className={`relative group flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${pkg.popular
                                        ? 'border-studio-gold bg-studio-gold/10 hover:bg-studio-gold/20'
                                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                        }`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 px-3 py-1 bg-studio-gold text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">
                                        {pkg.credits} <span className="text-sm font-normal text-gray-400">Credits</span>
                                    </div>
                                    <div className={`text-lg font-semibold ${pkg.popular ? 'text-studio-gold' : 'text-gray-300'}`}>
                                        {pkg.price}
                                    </div>
                                    {processingPkg === pkg.id && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                            <Loader2 className="animate-spin text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 bg-white/5 text-center text-xs text-gray-500">
                            Secure payment via Stripe. Credits added instantly.
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="text-studio-gold" /> Client Dashboard
                    </h1>

                    {/* Credit Counter Card */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                        <div className="bg-studio-gold/20 p-3 rounded-full text-studio-gold">
                            <Coins size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Available Credits</p>
                            <p className="text-2xl font-bold text-white leading-none">{credits}</p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                            <button
                                onClick={() => setShowBuyModal(true)}
                                className="px-4 py-2 bg-studio-gold text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white transition-colors"
                            >
                                Buy More
                            </button>
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    navigate('/login');
                                }}
                                className="text-xs text-gray-400 hover:text-white underline"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Submissions Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 text-xs uppercase font-semibold text-gray-300">
                                    <tr>
                                        <th className="p-4">Campaign / Agency</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Submitted At</th>
                                        <th className="p-4 text-right">Proof</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {submissions.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">
                                                No active submissions found. Start a new campaign!
                                            </td>
                                        </tr>
                                    ) : (
                                        submissions.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-medium text-white">
                                                    {item.agency_url || 'General Submission'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <StatusIcon status={item.status} />
                                                        <span className="capitalize">{item.status}</span>
                                                    </div>
                                                    {item.error_message && (
                                                        <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">
                                                            {item.error_message}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {item.proof_screenshot_url ? (
                                                        <a
                                                            href={item.proof_screenshot_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-studio-gold hover:underline text-xs"
                                                        >
                                                            View Proof <ExternalLink size={12} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;
