import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, Image as ImageIcon, Loader2, Upload, Sparkles, ScanFace, CheckCircle, Coins, XCircle, User } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import DashboardLayout from '../components/DashboardLayout';

const PhotoLab = ({ isEmbedded = false }) => {
    const [user, setUser] = useState(null);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState('upload'); // upload | processing | result
    const [inputImage, setInputImage] = useState(null); // URL or File
    const [generatedImage, setGeneratedImage] = useState(null);
    const [identityConstraints, setIdentityConstraints] = useState(null);
    const [error, setError] = useState(null);
    const [processingStage, setProcessingStage] = useState(''); // 'Analyzing Identity...' | 'Generating Digital...'

    // Buying Credits State
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [processingPkg, setProcessingPkg] = useState(null);
    const PACKAGES = [
        { credits: 10, price: '£5.00', amount: 500, id: 10, popular: false },
        { credits: 30, price: '£10.00', amount: 1000, id: 30, popular: true },
        { credits: 50, price: '£15.00', amount: 1500, id: 50, popular: false },
        { credits: 100, price: '£25.00', amount: 2500, id: 100, popular: false },
    ];

    const navigate = useNavigate();
    const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        setUser(user);

        // Fetch credits directly from profile (Standardized with Dashboard)
        const { data: profile, error: profileError } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
        if (profile && !profileError) {
            setCredits(profile.credits);
        } else {
            console.warn("Failed to fetch credits directly from Supabase profile, falling back to API.", profileError);
            fetchCredits(user.id); // Fallback to API if profile fetch fails
        }

        setLoading(false);

        // Subscribe to credit updates
        const channel = supabase.channel('photolab_realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => { if (payload.new) setCredits(payload.new.credits); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    // Legacy fetch (kept as backup, or can be removed if confident)
    const fetchCredits = async (userId) => {
        try {
            const response = await axios.get(`${API_URL}/api/credits/balance?user_id=${userId}`);
            setCredits(response.data.credits);
        } catch (err) {
            console.error("Failed to fetch credits via API", err);
        }
    };

    const handleBuyCredits = async (pkgId) => {
        try {
            setProcessingPkg(pkgId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
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

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Temporary local preview
        const previewUrl = URL.createObjectURL(file);
        setInputImage(previewUrl);

        // Upload to Supabase Storage to get a public URL for the backend
        try {
            const fileName = `${user.id}/${Date.now()}_input.jpg`;
            const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
            setInputImage(publicUrl); // Update to public URL
        } catch (e) {
            console.error("Upload failed", e);
            setError("Failed to upload image. Please try again.");
        }
    };

    const handleGenerate = async () => {
        if (credits < 1) {
            setError("Insufficient credits.");
            setShowBuyModal(true);
            return;
        }
        if (!inputImage) { setError("Please upload a selfie first."); return; }

        setStep('processing');
        setProcessingStage('Analyzing Identity Anchors...');
        setError(null);

        try {
            // Call the new Strict Identity Endpoint
            const response = await axios.post(`${API_URL}/api/generate-digitals`, {
                user_id: user.id,
                photo_url: inputImage
            });

            if (response.data.status === 'success') {
                setIdentityConstraints(response.data.identity_constraints);
                setProcessingStage('Developing Model Digital...');

                // Simulate a slight delay or if the response already contains the image
                // The backend returns { identity_constraints, image_bytes }
                // We need to convert bytes to a displayable format
                const imageSrc = `data:image/jpeg;base64,${response.data.image_bytes}`;
                setGeneratedImage(imageSrc);
                setStep('result');

                // Optimistically deduct 1 credit (realtime sub will fix it)
                setCredits(prev => Math.max(0, prev - 1));
            } else if (response.data.error) {
                throw new Error(response.data.error);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Generation failed. Please try again.");
            setStep('upload');
        }
    };

    if (loading) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" size={32} /></div>;

    // Standardized Header Component
    const PhotoLabHeader = () => (
        <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-6xl mx-auto">
            {/* Left: Brand / Title */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-start/10 rounded-xl text-brand-start">
                    <Camera size={20} />
                </div>
                <h1 className="text-xl font-black tracking-tight">Identity Lab</h1>
            </div>

            {/* Right: Credits, Theme, Profile Link */}
            <div className="flex items-center gap-3">
                {/* Credits Badge */}
                <div
                    onClick={() => setShowBuyModal(true)}
                    className="cursor-pointer bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-full pl-3 pr-1 py-1 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform"
                >
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase">Credits</span>
                        <span className="text-sm font-black text-brand-start">{credits}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-brand-start text-white flex items-center justify-center shadow-sm">
                        <Coins size={12} />
                    </div>
                </div>

                <ThemeToggle />

                <button
                    onClick={() => {
                        navigate('/dashboard?tab=profile');
                    }}
                    className="hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-text-primary-light dark:text-white"
                    title="Profile"
                >
                    <User size={18} />
                </button>
            </div>
        </div>
    );

    return (
    const content = (
            <div className="space-y-6">
                {!isEmbedded && (
                    <div className="text-center md:text-left">
                        <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">Create strict Model Digitals from your selfies using AI.</p>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    1. The Source
                                    {inputImage && <CheckCircle size={18} className="text-green-500" />}
                                </h2>

                                {inputImage ? (
                                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-dashed border-gray-200 dark:border-white/10 group-hover:border-brand-start/50 transition-colors">
                                        <img src={inputImage} alt="Input" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setInputImage(null)}
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                                        >
                                            <Upload size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-12 h-12 rounded-full bg-brand-start/10 text-brand-start flex items-center justify-center">
                                            <Upload size={24} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-text-primary-light dark:text-white">Upload Selfie</p>
                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Neutral lighting, no heavy makeup</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {step !== 'result' && (
                            <button
                                onClick={handleGenerate}
                                disabled={!inputImage || credits < 1 || step === 'processing'}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg ${!inputImage || credits < 1
                                    ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
                                    : 'bg-brand-start hover:bg-brand-mid text-white'
                                    }`}
                            >
                                {step === 'processing' ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Sparkles size={20} />
                                )}
                                {step === 'processing' ? processingStage : 'Generate Digital (1 Credit)'}
                            </button>
                        )}

                        {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-900/10 py-2 rounded-lg">{error}</p>}
                    </div>

                    {/* Output Section */}
                    <div className="space-y-6">
                        <div className={`bg-white dark:bg-card-dark p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm h-full min-h-[500px] flex flex-col relative transition-all ${step === 'processing' ? 'ring-2 ring-brand-start/50' : ''}`}>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                2. The Result
                                {step === 'result' && <Sparkles size={18} className="text-brand-start" />}
                            </h2>

                            {step === 'processing' ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center animate-pulse">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand-start/20 blur-xl rounded-full"></div>
                                        <ScanFace size={64} className="text-brand-start relative z-10 animate-scan" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary-light dark:text-white mb-2">{processingStage}</h3>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mx-auto">
                                            {processingStage.includes('Identity')
                                                ? 'Extracting bone structure and permanent features...'
                                                : 'rendering strict polaroid with natural skin texture...'}
                                        </p>
                                    </div>
                                </div>
                            ) : step === 'result' && generatedImage ? (
                                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-700">
                                    <div className="relative rounded-lg overflow-hidden shadow-2xl bg-white p-2 md:p-4 rotate-1 border border-gray-100">
                                        <img src={generatedImage} alt="Model Digital" className="w-full h-auto rounded-sm filter contrast-110 saturate-[0.85]" />
                                        <div className="mt-4 flex justify-between items-end">
                                            <div className="font-handwriting text-black/80 text-xl transform -rotate-2 ml-2">Digital #01</div>
                                            <img src="/logo-small.png" className="h-6 opacity-50 grayscale" alt="" />
                                        </div>
                                    </div>

                                    {identityConstraints && (
                                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 text-xs">
                                            <p className="font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-2">Locked Identity Anchors:</p>
                                            <p className="text-text-primary-light dark:text-white leading-relaxed font-mono opacity-80">{identityConstraints}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setStep('upload'); setGeneratedImage(null); setInputImage(null); }}
                                        className="mt-auto w-full py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl font-bold transition-colors text-text-primary-light dark:text-white"
                                    >
                                        Create Another
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark opacity-40">
                                    <ImageIcon size={48} className="mb-4" />
                                    <p>Waiting for source...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(10px); opacity: 1; }
                }
                .animate-scan { animation: scan 2s infinite ease-in-out; }
            `}</style>
            </div>
        );

    return (
        <>
            {/* Buy Credits Modal (Shared System) */}
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

            {isEmbedded ? (
                content
            ) : (
                <DashboardLayout header={<PhotoLabHeader />}>
                    {content}
                </DashboardLayout>
            )}
        </>
    );
};

export default PhotoLab;
