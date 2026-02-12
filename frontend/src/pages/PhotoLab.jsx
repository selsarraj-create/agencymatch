import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, Image as ImageIcon, Loader2, Upload, Sparkles, ScanFace, CheckCircle, Coins, XCircle, User, HelpCircle, X, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import DashboardLayout from '../components/DashboardLayout';

/* ─── Ghost Silhouette SVGs ──────────────────────────────────────────── */
const PortraitSilhouette = () => (
    <svg viewBox="0 0 120 160" fill="none" className="w-20 h-28 opacity-[0.08] dark:opacity-[0.06]">
        {/* Head */}
        <ellipse cx="60" cy="50" rx="28" ry="32" fill="currentColor" />
        {/* Neck */}
        <rect x="48" y="78" width="24" height="16" rx="4" fill="currentColor" />
        {/* Shoulders */}
        <path d="M20 140 C20 110 40 94 60 94 C80 94 100 110 100 140 L20 140Z" fill="currentColor" />
    </svg>
);

const FullBodySilhouette = () => (
    <svg viewBox="0 0 100 220" fill="none" className="w-16 h-36 opacity-[0.08] dark:opacity-[0.06]">
        {/* Head */}
        <ellipse cx="50" cy="24" rx="16" ry="18" fill="currentColor" />
        {/* Neck */}
        <rect x="44" y="40" width="12" height="8" rx="2" fill="currentColor" />
        {/* Torso */}
        <path d="M28 48 L72 48 L68 120 L32 120 Z" fill="currentColor" rx="4" />
        {/* Arms */}
        <rect x="14" y="52" width="14" height="52" rx="7" fill="currentColor" />
        <rect x="72" y="52" width="14" height="52" rx="7" fill="currentColor" />
        {/* Legs */}
        <rect x="34" y="120" width="14" height="70" rx="6" fill="currentColor" />
        <rect x="52" y="120" width="14" height="70" rx="6" fill="currentColor" />
        {/* Feet */}
        <ellipse cx="41" cy="194" rx="10" ry="5" fill="currentColor" />
        <ellipse cx="59" cy="194" rx="10" ry="5" fill="currentColor" />
    </svg>
);

/* ─── Good vs Bad Guide Modal ──────────────────────────────────────── */
const GuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <HelpCircle size={20} className="text-brand-start" /> Photo Guide
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {/* Correct */}
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle size={18} className="text-green-500" />
                            <span className="font-bold text-green-700 dark:text-green-400">Correct</span>
                        </div>
                        <ul className="text-sm space-y-1.5 text-green-800 dark:text-green-300">
                            <li>✓ Plain white t-shirt or simple clothing</li>
                            <li>✓ Well-lit, natural or studio lighting</li>
                            <li>✓ Neutral wall or clean background</li>
                            <li>✓ No heavy makeup or filters</li>
                            <li>✓ Face clearly visible, no obstructions</li>
                        </ul>
                    </div>
                    {/* Incorrect */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <XCircle size={18} className="text-red-500" />
                            <span className="font-bold text-red-700 dark:text-red-400">Incorrect</span>
                        </div>
                        <ul className="text-sm space-y-1.5 text-red-800 dark:text-red-300">
                            <li>✗ Heavy Instagram filters or editing</li>
                            <li>✗ Baggy or patterned clothing</li>
                            <li>✗ Cluttered or busy backgrounds</li>
                            <li>✗ Sunglasses covering face/eyes</li>
                            <li>✗ Group photos or cropped images</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Upload Box Component ─────────────────────────────────────────── */
const UploadBox = ({ label, preview, silhouette: Silhouette, onFileSelect, onClear, error: fileError }) => {
    const inputRef = useRef(null);

    return (
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark mb-2 text-center">{label}</p>
            {preview ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-green-300 dark:border-green-700 group bg-gray-100 dark:bg-white/5">
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                    >
                        <X size={14} />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-green-100 font-bold bg-green-600/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <CheckCircle size={10} /> Ready
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-brand-start/40 transition-all cursor-pointer group"
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => onFileSelect(e.target.files[0])}
                        className="hidden"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Silhouette />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-brand-start/10 text-brand-start flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload size={18} />
                        </div>
                        <p className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">Tap to upload</p>
                    </div>
                </div>
            )}
            {fileError && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertTriangle size={12} /> {fileError}
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════
   Main PhotoLab Component
   ═══════════════════════════════════════════════════════════════════════ */
const PhotoLab = ({ isEmbedded = false }) => {
    const [user, setUser] = useState(null);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState('upload'); // upload | processing | result

    // Dual reference state
    const [portraitRef, setPortraitRef] = useState(null);     // { preview, url }
    const [fullBodyRef, setFullBodyRef] = useState(null);     // { preview, url }
    const [portraitError, setPortraitError] = useState(null);
    const [fullBodyError, setFullBodyError] = useState(null);

    const [generatedImage, setGeneratedImage] = useState(null);
    const [identityConstraints, setIdentityConstraints] = useState(null);
    const [error, setError] = useState(null);
    const [processingStage, setProcessingStage] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    // Credits modal
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

    const bothReady = portraitRef?.url && fullBodyRef?.url;

    useEffect(() => { checkUser(); }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        setUser(user);
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
        if (profile) setCredits(profile.credits);
        setLoading(false);

        const channel = supabase.channel('photolab_realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => {
                if (payload.new) setCredits(payload.new.credits);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    };

    const handleBuyCredits = async (pkgId) => {
        try {
            setProcessingPkg(pkgId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const response = await axios.post(`${API_URL}/create-checkout-session`, { user_id: user.id, amount: pkgId });
            if (response.data.url) window.location.href = response.data.url;
        } catch (err) {
            console.error("Checkout Error:", err);
            alert("Failed to start checkout.");
            setProcessingPkg(null);
        }
    };

    /* ── File Validation + Upload ──────────────────────────────────── */
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

    const validateAndUpload = async (file, setter, setErr) => {
        setErr(null);
        if (!file) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
            setErr('JPEG or PNG only');
            return;
        }
        if (file.size > MAX_SIZE) {
            setErr('Max 5MB');
            return;
        }

        const preview = URL.createObjectURL(file);
        setter({ preview, url: null }); // show thumbnail immediately

        try {
            const fileName = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
            setter({ preview, url: publicUrl });
        } catch (e) {
            console.error("Upload failed", e);
            setErr('Upload failed');
            setter(null);
        }
    };

    /* ── Generate ─────────────────────────────────────────────────── */
    const handleGenerate = async () => {
        if (credits < 1) { setError("Insufficient credits."); setShowBuyModal(true); return; }
        if (!bothReady) { setError("Upload both photos first."); return; }

        setStep('processing');
        setProcessingStage('Locking Identity Anchors...');
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/generate-digitals-dual`, {
                user_id: user.id,
                portrait_url: portraitRef.url,
                fullbody_url: fullBodyRef.url,
            });

            if (response.data.status === 'success') {
                setIdentityConstraints(response.data.identity_constraints);
                setProcessingStage('Rendering Full-Length Digital...');
                const imageSrc = `data:image/jpeg;base64,${response.data.image_bytes}`;
                setGeneratedImage(imageSrc);
                setStep('result');
                setCredits(prev => Math.max(0, prev - 1));
            } else if (response.data.error) {
                throw new Error(response.data.error);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Generation failed.");
            setStep('upload');
        }
    };

    const resetAll = () => {
        setStep('upload');
        setGeneratedImage(null);
        setIdentityConstraints(null);
        setPortraitRef(null);
        setFullBodyRef(null);
        setError(null);
    };

    if (loading) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" size={32} /></div>;

    /* ── Header ───────────────────────────────────────────────────── */
    const PhotoLabHeader = () => (
        <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-start/10 rounded-xl text-brand-start"><Camera size={20} /></div>
                <h1 className="text-xl font-black tracking-tight">Identity Lab</h1>
            </div>
            <div className="flex items-center gap-3">
                <div onClick={() => setShowBuyModal(true)} className="cursor-pointer bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-full pl-3 pr-1 py-1 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase">Credits</span>
                        <span className="text-sm font-black text-brand-start">{credits}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-brand-start text-white flex items-center justify-center shadow-sm"><Coins size={12} /></div>
                </div>
                <ThemeToggle />
                <button onClick={() => navigate('/dashboard?tab=profile')} className="hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-text-primary-light dark:text-white" title="Profile"><User size={18} /></button>
            </div>
        </div>
    );

    /* ── Content ──────────────────────────────────────────────────── */
    const content = (
        <div className="space-y-6 px-4 md:px-0">

            {/* Header + Guide Link */}
            <div className="text-center">
                <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Upload a portrait and a full-body shot to create your model digital.
                </p>
                <button onClick={() => setShowGuide(true)} className="text-brand-start text-xs font-bold mt-1 hover:underline inline-flex items-center gap-1">
                    <HelpCircle size={12} /> View Photo Guide
                </button>
            </div>

            {/* Main Grid: Inputs (left) | Output (right) */}
            <div className="grid md:grid-cols-2 gap-8">

                {/* ── Input Section ─────────────────────────────────── */}
                <div className="space-y-5">
                    <div className="bg-white dark:bg-card-dark p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            1. References
                            {bothReady && <CheckCircle size={16} className="text-green-500" />}
                        </h2>

                        {/* Side-by-side upload grid */}
                        <div className="flex gap-[4%]">
                            <UploadBox
                                label="Portrait"
                                preview={portraitRef?.preview}
                                silhouette={PortraitSilhouette}
                                onFileSelect={(file) => validateAndUpload(file, setPortraitRef, setPortraitError)}
                                onClear={() => setPortraitRef(null)}
                                error={portraitError}
                            />
                            <UploadBox
                                label="Full Body"
                                preview={fullBodyRef?.preview}
                                silhouette={FullBodySilhouette}
                                onFileSelect={(file) => validateAndUpload(file, setFullBodyRef, setFullBodyError)}
                                onClear={() => setFullBodyRef(null)}
                                error={fullBodyError}
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    {step !== 'result' && (
                        <button
                            onClick={handleGenerate}
                            disabled={!bothReady || credits < 1 || step === 'processing'}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg text-sm ${!bothReady || credits < 1
                                    ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-brand-start to-brand-end hover:brightness-110 text-white'
                                }`}
                        >
                            {step === 'processing' ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Sparkles size={18} />
                            )}
                            {step === 'processing'
                                ? processingStage
                                : bothReady
                                    ? 'Generate Digital (1 Credit)'
                                    : 'Upload both photos to continue'}
                        </button>
                    )}

                    {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-900/10 py-2 rounded-lg">{error}</p>}
                </div>

                {/* ── Output Section ────────────────────────────────── */}
                <div className="space-y-6">
                    <div className={`bg-white dark:bg-card-dark p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm h-full min-h-[500px] flex flex-col relative transition-all ${step === 'processing' ? 'ring-2 ring-brand-start/50' : ''}`}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            2. The Result
                            {step === 'result' && <Sparkles size={16} className="text-brand-start" />}
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
                                            ? 'Merging face and body references for identity lock...'
                                            : 'Rendering full-length digital with DSLR-quality skin texture...'}
                                    </p>
                                </div>
                            </div>
                        ) : step === 'result' && generatedImage ? (
                            <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-700">
                                <div className="relative rounded-lg overflow-hidden shadow-2xl bg-white p-2 md:p-4 rotate-1 border border-gray-100">
                                    <img src={generatedImage} alt="Model Digital" className="w-full h-auto rounded-sm filter contrast-110 saturate-[0.85]" />
                                    <div className="mt-4 flex justify-between items-end">
                                        <div className="font-handwriting text-black/80 text-xl transform -rotate-2 ml-2">Digital #01</div>
                                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                            <CheckCircle size={10} /> Saved to Profile
                                        </div>
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
                                    onClick={resetAll}
                                    className="mt-auto w-full py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl font-bold transition-colors text-text-primary-light dark:text-white"
                                >
                                    Create Another
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark opacity-40">
                                <ImageIcon size={48} className="mb-4" />
                                <p>Waiting for references...</p>
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
            {/* Guide Modal */}
            <AnimatePresence>
                {showGuide && <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />}
            </AnimatePresence>

            {/* Buy Credits Modal */}
            {showBuyModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Coins className="text-brand-start" /> Buy Credits</h3>
                            <button onClick={() => setShowBuyModal(false)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PACKAGES.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleBuyCredits(pkg.id)}
                                    disabled={!!processingPkg}
                                    className={`relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all active:scale-95 ${pkg.popular
                                        ? 'border-brand-start bg-brand-start/5'
                                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-brand-start/50'}`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 px-3 py-1 bg-brand-start text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">Most Popular</div>
                                    )}
                                    <div className="text-3xl font-black mb-1">{pkg.credits}</div>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide mb-2">Credits</span>
                                    <div className="text-lg font-bold text-brand-start">{pkg.price}</div>
                                    {processingPkg === pkg.id && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-brand-start" /></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isEmbedded ? content : (
                <DashboardLayout header={<PhotoLabHeader />}>
                    {content}
                </DashboardLayout>
            )}
        </>
    );
};

export default PhotoLab;
