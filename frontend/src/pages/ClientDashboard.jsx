import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, ExternalLink, CheckCircle, XCircle, Clock, Loader2, Coins, ArrowRight, CheckCircle2, User } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import ProfileEditor from '../components/ProfileEditor';
import DashboardLayout from '../components/DashboardLayout';

const ClientDashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [processingPkg, setProcessingPkg] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [selectedAgencies, setSelectedAgencies] = useState(new Set());
    const [applying, setApplying] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'profile'
    const [currentUserId, setCurrentUserId] = useState(null);

    const navigate = useNavigate();

    const PACKAGES = [
        { credits: 10, price: '£5.00', amount: 500, id: 10, popular: false },
        { credits: 30, price: '£10.00', amount: 1000, id: 30, popular: true },
        { credits: 50, price: '£15.00', amount: 1500, id: 50, popular: false },
        { credits: 100, price: '£25.00', amount: 2500, id: 100, popular: false },
    ];

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
            alert("Failed to start checkout.");
            setProcessingPkg(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/login'); return; }
            setCurrentUserId(user.id);

            // Check URL param for tab
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam === 'profile') setActiveTab('profile');
            else setActiveTab('dashboard'); // Default reset if no param

            const profile = await supabase.from('profiles').select('credits').eq('id', user.id).single();
            if (profile.data) setCredits(profile.data.credits);

            const { data } = await supabase.from('agency_submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) setSubmissions(data);

            try {
                const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
                const agencyResp = await axios.get(`${API_URL}/agencies`);
                if (agencyResp.data) setAgencies(agencyResp.data);
            } catch (e) { console.error("Failed to load agencies", e); }

            setLoading(false);

            const channel = supabase.channel('dashboard_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_submissions', filter: `user_id=eq.${user.id}` }, payload => handleSubmissionUpdate(payload))
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => { if (payload.new) setCredits(payload.new.credits); })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        };
        fetchData();
        // Listen for Location changes to update tab if user clicks Nav while already on page
    }, [navigate, window.location.search]);

    const handleSubmissionUpdate = (payload) => {
        if (payload.eventType === 'INSERT') setSubmissions(prev => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE') setSubmissions(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
    };

    const toggleAgency = (id) => {
        const newSelected = new Set(selectedAgencies);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedAgencies(newSelected);
    };

    const handleBulkApply = async () => {
        if (selectedAgencies.size === 0) return;
        const cost = selectedAgencies.size;
        if (credits < cost) {
            alert(`Insufficient credits. You need ${cost} credits.`);
            setShowBuyModal(true);
            return;
        }
        if (!window.confirm(`Apply to ${selectedAgencies.size} agencies for ${cost} credits?`)) return;

        setApplying(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
            const response = await axios.post(`${API_URL}/apply-bulk`, { user_id: user.id, agency_ids: Array.from(selectedAgencies) });
            if (response.data.status === 'success') {
                alert(response.data.message);
                setCredits(response.data.new_balance);
                setSelectedAgencies(new Set());
            }
        } catch (error) {
            console.error("Apply Failed:", error);
            alert(error.response?.data?.error || "Application failed");
        } finally {
            setApplying(false);
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
            case 'failed': return <XCircle className="text-red-500" size={20} />;
            case 'processing': return <Loader2 className="animate-spin text-brand-start" size={20} />;
            default: return <Clock className="text-text-secondary-light dark:text-text-secondary-dark" size={20} />;
        }
    };

    if (loading) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" size={32} /></div>;

    // Define Header Component
    const DashboardHeader = () => (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-8 py-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-start/10 rounded-2xl text-brand-start">
                    <LayoutDashboard size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">Manage your agency applications</p>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => {
                            setActiveTab('dashboard');
                            navigate('/dashboard'); // Clear params
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-black dark:hover:text-white'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('profile');
                            navigate('/dashboard?tab=profile'); // Set params
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-black dark:hover:text-white'}`}
                    >
                        <User size={14} /> Profile
                    </button>
                </div>

                <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-full pl-5 pr-2 py-2 flex items-center gap-4 shadow-sm">
                    <div className="flex flex-col items-end leading-tight">
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase">Credits</span>
                        <span className="text-xl font-black text-brand-start">{credits}</span>
                    </div>
                    <button
                        onClick={() => setShowBuyModal(true)}
                        className="w-8 h-8 rounded-full bg-brand-start text-white flex items-center justify-center hover:bg-brand-end transition-colors shadow-md active:scale-95"
                    >
                        <Coins size={16} />
                    </button>
                </div>
                <ThemeToggle />
                <button
                    onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
                    className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500 transition-colors px-4"
                >
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Buy Credits Modal is strictly overlay, kept outside logic for now or inside layout? Overlay is fine. */}
            {showBuyModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Coins className="text-brand-start" /> Buy Credits
                            </h3>
                            <button onClick={() => setShowBuyModal(false)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PACKAGES.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleBuyCredits(pkg.id)}
                                    disabled={!!processingPkg}
                                    className={`relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all active:scale-95 ${pkg.popular
                                        ? 'border-brand-start bg-brand-start/5'
                                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-brand-start/50'
                                        }`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 px-3 py-1 bg-brand-start text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="text-3xl font-black mb-1">
                                        {pkg.credits}
                                    </div>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide mb-2">Credits</span>
                                    <div className="text-lg font-bold text-brand-start">
                                        {pkg.price}
                                    </div>
                                    {processingPkg === pkg.id && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-2xl">
                                            <Loader2 className="animate-spin text-brand-start" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <DashboardLayout header={<DashboardHeader />}>
                {/* Content Area */}
                {activeTab === 'profile' ? (
                    <ProfileEditor userId={currentUserId} />
                ) : (
                    <>
                        {/* Agency Directory Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Agency Directory <span className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm ml-2">({agencies.length} available)</span></h2>
                                {selectedAgencies.size > 0 && (
                                    <button
                                        onClick={handleBulkApply}
                                        disabled={applying}
                                        className="bg-text-primary-light dark:bg-white text-white dark:text-black px-6 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                                    >
                                        {applying ? <Loader2 className="animate-spin" /> : 'Apply Selected'}
                                        <span className="text-xs bg-white/20 dark:bg-black/10 px-2 py-1 rounded-full text-current">
                                            {selectedAgencies.size}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
                                {agencies.length === 0 ? (
                                    <div className="col-span-full text-center text-text-secondary-light dark:text-text-secondary-dark py-12 bg-card-light dark:bg-card-dark rounded-3xl border border-gray-200 dark:border-white/10">
                                        <Loader2 className="animate-spin mx-auto mb-2" />
                                        Loading agencies...
                                    </div>
                                ) : (
                                    agencies.map(agency => (
                                        <div
                                            key={agency.id}
                                            onClick={() => toggleAgency(agency.id)}
                                            className={`p-6 rounded-3xl border cursor-pointer transition-all group relative overflow-hidden ${selectedAgencies.has(agency.id)
                                                ? 'bg-brand-start/5 border-brand-start ring-1 ring-brand-start shadow-md'
                                                : 'bg-card-light dark:bg-card-dark border-gray-200 dark:border-white/10 hover:border-brand-start/30 hover:shadow-lg hover:-translate-y-1'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start relative z-10">
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight mb-1">{agency.name}</h3>
                                                    <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide">{agency.location}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedAgencies.has(agency.id) ? 'bg-brand-start border-brand-start scale-110' : 'border-gray-300 dark:border-white/20 group-hover:border-brand-start'}`}>
                                                    {selectedAgencies.has(agency.id) && <CheckCircle size={14} className="text-white" />}
                                                </div>
                                            </div>
                                            {/* Sublte Category Tag */}
                                            <div className="mt-4 flex gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark px-2 py-1 rounded-md">
                                                    {agency.category || 'Modeling'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent submissions */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Recent Applications</h2>
                            <div className="bg-card-light dark:bg-card-dark rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">
                                            <tr>
                                                <th className="p-5">Agency</th>
                                                <th className="p-5">Status</th>
                                                <th className="p-5">Date</th>
                                                <th className="p-5 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {submissions.length === 0 ? (
                                                <tr><td colSpan="4" className="p-8 text-center text-text-secondary-light dark:text-text-secondary-dark font-medium">No applications yet. Start selecting agencies above!</td></tr>
                                            ) : (
                                                submissions.map((item) => (
                                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="p-5 font-bold">{item.agency_url}</td>
                                                        <td className="p-5">
                                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${item.status === 'success' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/20' :
                                                                item.status === 'failed' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20' :
                                                                    'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/20'
                                                                }`}>
                                                                <StatusIcon status={item.status} />
                                                                <span className="capitalize">{item.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-text-secondary-light dark:text-text-secondary-dark font-medium">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            {item.proof_screenshot_url && (
                                                                <a href={item.proof_screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-start font-bold hover:underline">
                                                                    Proof <ExternalLink size={14} />
                                                                </a>
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
                    </>
                )}
            </DashboardLayout>

            {/* Mobile Sticky Bar - Only show on dashboard tab */}
            {activeTab === 'dashboard' && selectedAgencies.size > 0 && (
                <div className="fixed bottom-24 left-4 right-4 p-4 bg-text-primary-light dark:bg-card-dark border border-white/10 rounded-2xl md:hidden z-50 flex items-center justify-between shadow-2xl">
                    <div className="text-white">
                        <span className="font-bold text-lg">{selectedAgencies.size}</span>
                        <span className="text-xs text-gray-400 block font-medium uppercase">Selected</span>
                    </div>
                    <button
                        onClick={handleBulkApply}
                        disabled={applying}
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform flex items-center gap-2"
                    >
                        {applying ? <Loader2 className="animate-spin" /> : 'Apply Now'}
                    </button>
                </div>
            )}
        </>
    );
};

export default ClientDashboard;
