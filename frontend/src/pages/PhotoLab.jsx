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
                        <div className="flex gap-4">
                            <img src="/assets/guide_correct_v2.png" alt="Correct Example" className="w-24 h-32 object-cover rounded-lg border border-green-200 dark:border-green-800/30" />
                            <ul className="text-sm space-y-1.5 text-green-800 dark:text-green-300 flex-1">
                                <li>✓ Plain white t-shirt or simple clothing</li>
                                <li>✓ Well-lit, natural or studio lighting</li>
                                <li>✓ Neutral wall or clean background</li>
                                <li>✓ No heavy makeup or filters</li>
                                <li>✓ Face clearly visible, no obstructions</li>
                            </ul>
                        </div>
                    </div>
                    {/* Incorrect */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <XCircle size={18} className="text-red-500" />
                            <span className="font-bold text-red-700 dark:text-red-400">Incorrect</span>
                        </div>
                        <div className="flex gap-4">
                            <img src="/assets/guide_incorrect_v2.png" alt="Incorrect Example" className="w-24 h-32 object-cover rounded-lg border border-red-200 dark:border-red-800/30" />
                            <ul className="text-sm space-y-1.5 text-red-800 dark:text-red-300 flex-1">
                                <li>✗ Heavy Instagram filters or editing</li>
                                <li>✗ Baggy or patterned clothing</li>
                                <li>✗ Cluttered or busy backgrounds</li>
                                <li>✗ Sunglasses covering face/eyes</li>
                                <li>✗ Group photos or cropped images</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Stats Result Modal ───────────────────────────────────────────── */
const StatsModal = ({ isOpen, onClose, stats, onSave, saving }) => {
    if (!isOpen || !stats) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black flex items-center gap-2">
                        <ScanFace className="text-brand-start" /> Auto-Measurements
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Measurements Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">Waist</span>
                            <div className="text-2xl font-black">{stats.waist_cm}cm</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">Hips</span>
                            <div className="text-2xl font-black">{stats.hips_cm}cm</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">Bust/Chest</span>
                            <div className="text-2xl font-black">{stats.bust_cm}cm</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">Shoe Size</span>
                            <div className="text-2xl font-black">UK {stats.shoe_size_uk}</div>
                        </div>
                    </div>

                    {/* Color Analysis */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <span className="text-sm font-bold">Eye Color</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{stats.eye_color?.category}</span>
                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: stats.eye_color?.hex }}></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <span className="text-sm font-bold">Hair Color</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{stats.hair_color?.category}</span>
                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: stats.hair_color?.hex }}></div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="w-full py-4 bg-brand-start hover:bg-brand-mid text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                        Save to Profile
                    </button>
                    <p className="text-[10px] text-center text-gray-400">
                        *Estimates based on computer vision. Please verify manually.
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ─── Upload Box Component ─────────────────────────────────────────── */
const UploadBox = ({ label, preview, silhouette: Silhouette, onFileSelect, onClear, error: fileError, auditing, auditStatus }) => {
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
                    {auditing ? (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-blue-100 font-bold bg-blue-600/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <Loader2 size={10} className="animate-spin" /> Analyzing...
                        </div>
                    ) : auditStatus === false ? (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-red-100 font-bold bg-red-600/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <XCircle size={10} /> Action Needed
                        </div>
                    ) : (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-green-100 font-bold bg-green-600/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <CheckCircle size={10} /> Ready
                        </div>
                    )}
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



    // Stats State
    const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'ft'
    const [heightCm, setHeightCm] = useState('');
    const [heightFt, setHeightFt] = useState('');
    const [heightIn, setHeightIn] = useState('');

    const [statsResult, setStatsResult] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [analyzingStats, setAnalyzingStats] = useState(false);
    const [savingStats, setSavingStats] = useState(false);

    // Dual reference state
    const [portraitRef, setPortraitRef] = useState(null);     // { preview, url }
    const [fullBodyRef, setFullBodyRef] = useState(null);     // { preview, url }
    const [portraitError, setPortraitError] = useState(null);
    const [fullBodyError, setFullBodyError] = useState(null);

    // Audit state
    const [portraitAudit, setPortraitAudit] = useState(null);   // { score, issues, can_proceed }
    const [fullBodyAudit, setFullBodyAudit] = useState(null);
    const [auditingPortrait, setAuditingPortrait] = useState(false);
    const [auditingFullBody, setAuditingFullBody] = useState(false);

    const [generatedImages, setGeneratedImages] = useState(null);
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

    // Derived state: ready only if both uploaded, audits complete, and no blocking issues
    const bothReady = portraitRef?.url && fullBodyRef?.url &&
        !auditingPortrait && !auditingFullBody &&
        portraitAudit?.can_proceed !== false &&
        fullBodyAudit?.can_proceed !== false;

    useEffect(() => { checkUser(); }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        setUser(user);
        const { data: profile } = await supabase.from('profiles').select('credits, height').eq('id', user.id).single();
        if (profile) {
            setCredits(profile.credits);
            if (profile.height) {
                // Try to parse existing height
                const h = profile.height.toLowerCase();
                if (h.includes('cm')) {
                    setHeightUnit('cm');
                    setHeightCm(h.replace('cm', '').trim());
                } else if (h.includes("'")) {
                    setHeightUnit('ft');
                    const [f, i] = h.split("'");
                    setHeightFt(f.trim());
                    setHeightIn(i.replace('"', '').trim());
                } else {
                    // Fallback assume cm if just number
                    setHeightCm(h.trim());
                }
            }
        }
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

    const validateAndUpload = async (file, setter, setErr, setAudit, setAuditing) => {
        setErr(null);
        setAudit(null);
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

            // Fire audit in background (non-blocking)
            setAuditing(true);
            try {
                const auditRes = await axios.post(`${API_URL}/audit-image`, { image_url: publicUrl });
                setAudit(auditRes.data);
            } catch (auditErr) {
                console.warn('Audit failed (non-blocking):', auditErr);
                setAudit({ score: 5, issues: [], can_proceed: true });
            } finally {
                setAuditing(false);
            }
        } catch (e) {
            console.error("Upload failed", e);
            setErr('Upload failed');
            setter(null);
        }
    };

    /* ── Generate ─────────────────────────────────────────────────── */
    const handleGenerate = async () => {
        if (credits < 5) { setError("Insufficient credits."); setShowBuyModal(true); return; }
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
                setGeneratedImages({
                    headshot: response.data.headshot_url || response.data.public_url,
                    fullbody: response.data.fullbody_url
                });
                setStep('result');
                setCredits(prev => Math.max(0, prev - 5));
            } else if (response.data.error) {
                throw new Error(response.data.error);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Generation failed.");
            setStep('upload');
        }
    };

    /* ── Stats Handlers ───────────────────────────────────────────── */
    const handleAnalyzeStats = async () => {
        let heightVal = heightCm;

        if (heightUnit === 'ft') {
            if (!heightFt) { alert("Please enter feet."); return; }
            // Convert to cm: 1 ft = 30.48 cm, 1 in = 2.54 cm
            const ft = parseInt(heightFt) || 0;
            const inch = parseInt(heightIn) || 0;
            heightVal = Math.round((ft * 30.48) + (inch * 2.54));
        }

        if (!heightVal) { alert("Please enter your height."); return; }
        if (!bothReady) { alert("Please upload both photos first."); return; }

        setAnalyzingStats(true);
        try {
            const response = await axios.post(`${API_URL}/analyze-stats`, {
                portrait_url: portraitRef.url,
                fullbody_url: fullBodyRef.url,
                height_cm: heightVal
            });

            if (response.data.error) throw new Error(response.data.error);

            setStatsResult(response.data);
            setShowStatsModal(true);
        } catch (e) {
            console.error("Stats Error:", e);
            alert("Failed to analyze stats. Please ensure photos are clear.");
        } finally {
            setAnalyzingStats(false);
        }
    };

    const handleSaveStats = async () => {
        if (!statsResult) return;
        setSavingStats(true);
        try {
            // Format height string based on current selection
            let heightStr = '';
            if (heightUnit === 'cm') {
                heightStr = `${heightCm}cm`;
            } else {
                heightStr = `${heightFt}'${heightIn}"`;
            }

            const updates = {
                waist_cm: statsResult.waist_cm,
                hips_cm: statsResult.hips_cm,
                bust_cm: statsResult.bust_cm,
                shoe_size_uk: statsResult.shoe_size_uk,
                eye_color: statsResult.eye_color?.category,
                hair_color: statsResult.hair_color?.category,
                height: heightStr
            };

            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;

            setShowStatsModal(false);
            alert("Measurements saved to your profile!");
        } catch (e) {
            console.error("Save Error:", e);
            alert("Failed to save stats.");
        } finally {
            setSavingStats(false);
        }
    };

    const resetAll = () => {
        setStep('upload');
        setGeneratedImages(null);
        setIdentityConstraints(null);
        setPortraitRef(null);
        setFullBodyRef(null);
        setPortraitAudit(null);
        setFullBodyAudit(null);
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

                        {/* Height Input & Auto-Analyze */}
                        <div className="mb-6 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl flex items-end gap-3 border border-gray-100 dark:border-white/5">
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Your Height</label>
                                    <div className="flex bg-gray-200 dark:bg-black/40 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setHeightUnit('ft')}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${heightUnit === 'ft' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                                        >
                                            FT
                                        </button>
                                        <button
                                            onClick={() => setHeightUnit('cm')}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${heightUnit === 'cm' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                                        >
                                            CM
                                        </button>
                                    </div>
                                </div>

                                {heightUnit === 'cm' ? (
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={heightCm}
                                            onChange={(e) => setHeightCm(e.target.value)}
                                            placeholder="175"
                                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 font-bold text-lg focus:ring-2 focus:ring-brand-start outline-none transition-all placeholder:font-normal"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">cm</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={heightFt}
                                                onChange={(e) => setHeightFt(e.target.value)}
                                                placeholder="5"
                                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 font-bold text-lg focus:ring-2 focus:ring-brand-start outline-none transition-all placeholder:font-normal"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">ft</span>
                                        </div>
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={heightIn}
                                                onChange={(e) => setHeightIn(e.target.value)}
                                                placeholder="9"
                                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 font-bold text-lg focus:ring-2 focus:ring-brand-start outline-none transition-all placeholder:font-normal"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">in</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {bothReady && (
                                <button
                                    onClick={handleAnalyzeStats}
                                    disabled={analyzingStats || (heightUnit === 'cm' ? !heightCm : !heightFt)}
                                    className="h-[46px] px-4 bg-brand-start/10 hover:bg-brand-start/20 text-brand-start rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {analyzingStats ? <Loader2 size={16} className="animate-spin" /> : <ScanFace size={18} />}
                                    Auto-Measure
                                </button>
                            )}
                        </div>

                        {/* Side-by-side upload grid */}
                        <div className="flex gap-[4%]">
                            <UploadBox
                                label="Portrait"
                                preview={portraitRef?.preview}
                                silhouette={PortraitSilhouette}
                                onFileSelect={(file) => validateAndUpload(file, setPortraitRef, setPortraitError, setPortraitAudit, setAuditingPortrait)}
                                onClear={() => { setPortraitRef(null); setPortraitAudit(null); }}
                                error={portraitError}
                                auditing={auditingPortrait}
                                auditStatus={portraitAudit?.can_proceed}
                            />
                            <UploadBox
                                label="Full Body"
                                preview={fullBodyRef?.preview}
                                silhouette={FullBodySilhouette}
                                onFileSelect={(file) => validateAndUpload(file, setFullBodyRef, setFullBodyError, setFullBodyAudit, setAuditingFullBody)}
                                onClear={() => { setFullBodyRef(null); setFullBodyAudit(null); }}
                                error={fullBodyError}
                                auditing={auditingFullBody}
                                auditStatus={fullBodyAudit?.can_proceed}
                            />
                        </div>

                        {/* Quality Feedback Cards */}
                        {[{ audit: portraitAudit, auditing: auditingPortrait, label: 'Portrait', setter: setPortraitRef, auditSetter: setPortraitAudit },
                        { audit: fullBodyAudit, auditing: auditingFullBody, label: 'Full Body', setter: setFullBodyRef, auditSetter: setFullBodyAudit }
                        ].map(({ audit, auditing, label, setter, auditSetter }) => {
                            // ── Unusable photo (can_proceed = false) ── RED warning
                            if (audit && audit.can_proceed === false) return (
                                <div
                                    key={label}
                                    className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 rounded-xl p-3"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg mt-0.5">⚠️</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1">
                                                {label} — Photo Not Usable
                                            </p>
                                            <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                                                {audit.issues?.includes('no_face')
                                                    ? "This doesn't appear to be a photo of a person. Please upload a clear photo of yourself — selfies and headshots work great!"
                                                    : audit.issues?.includes('obstructed') && audit.issues?.includes('too_dark')
                                                        ? "We can't clearly see the face here — it looks too dark and partially blocked. Try a well-lit photo with your face fully visible."
                                                        : audit.issues?.includes('obstructed')
                                                            ? "The face is blocked or hidden in this photo. Make sure your full face is clearly visible with no sunglasses, hands, or objects in the way."
                                                            : audit.issues?.includes('too_dark')
                                                                ? "This photo is too dark for us to identify facial features. Try again with natural light facing you."
                                                                : audit.issues?.includes('blurry')
                                                                    ? "This photo is too blurry for a clean identity lock. Try holding still in a well-lit area."
                                                                    : "This photo isn't usable for generation. Please try a clearer, well-lit photo."}
                                            </p>
                                            <button
                                                onClick={() => { setter(null); auditSetter(null); }}
                                                className="mt-2 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-full transition-colors"
                                            >
                                                Upload a Different Photo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                            // ── Low score but usable (can_proceed = true) ── AMBER nudge
                            if (audit && audit.score < 6 && audit.can_proceed) return (
                                <div
                                    key={label}
                                    className="mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg mt-0.5">🌟</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                                                Pro-Tip — {label}
                                            </p>
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                                {audit.issues?.includes('too_dark')
                                                    ? "Looking good! Just a heads-up: the lighting is a bit dim. For the most realistic studio look, try a photo with natural light facing you."
                                                    : audit.issues?.includes('blurry')
                                                        ? "Looking good! This one's a tiny bit blurry. For the sharpest result, try holding steady or using a well-lit spot."
                                                        : audit.issues?.includes('obstructed')
                                                            ? "Looking good! Part of the face seems slightly covered. For the best identity lock, make sure nothing blocks your features."
                                                            : "Looking good! For even better results, try a cleaner, well-lit photo."}
                                                {" "}Want to try another, or go with this one?
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => { setter(null); auditSetter(null); }}
                                                    className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/20 px-3 py-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
                                                >
                                                    Try Another
                                                </button>
                                                <button
                                                    onClick={() => auditSetter({ ...audit, score: 10 })}
                                                    className="text-[10px] font-bold text-amber-600 dark:text-amber-500 px-3 py-1 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                >
                                                    Go With This One
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                            // ── Auditing spinner
                            if (audit === null && auditing) return (
                                <div key={label} className="mt-3 flex items-center gap-2 text-[11px] text-text-secondary-light dark:text-text-secondary-dark">
                                    <Loader2 size={12} className="animate-spin" /> Checking {label.toLowerCase()} quality...
                                </div>
                            );
                            return null;
                        })}
                    </div>

                    {/* Generate Button */}
                    {step !== 'result' && (
                        <button
                            onClick={handleGenerate}
                            disabled={!bothReady || credits < 5 || step === 'processing'}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg text-sm ${!bothReady || credits < 5
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
                                    ? 'Generate Digitals (5 Credits)'
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
                        ) : step === 'result' && generatedImages ? (
                            <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-700">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Headshot */}
                                    <div className="relative rounded-lg overflow-hidden shadow-xl bg-white p-2 border border-gray-100 rotate-[-1deg] transition-transform hover:rotate-0 hover:scale-[1.02] duration-300">
                                        <img src={generatedImages.headshot} alt="Headshot" className="w-full h-auto rounded-sm filter contrast-110 saturate-[0.85]" />
                                        <div className="mt-2 text-center font-handwriting text-black/80 text-lg">Digital #01</div>
                                        <div className="absolute top-3 right-3 flex items-center gap-1 text-[8px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100 shadow-sm">
                                            HEADSHOT
                                        </div>
                                    </div>
                                    {/* Full Body */}
                                    {generatedImages.fullbody && (
                                        <div className="relative rounded-lg overflow-hidden shadow-xl bg-white p-2 border border-gray-100 rotate-[1deg] transition-transform hover:rotate-0 hover:scale-[1.02] duration-300">
                                            <img src={generatedImages.fullbody} alt="Full Body" className="w-full h-auto rounded-sm filter contrast-110 saturate-[0.85]" />
                                            <div className="mt-2 text-center font-handwriting text-black/80 text-lg">Digital #02</div>
                                            <div className="absolute top-3 right-3 flex items-center gap-1 text-[8px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100 shadow-sm">
                                                FULL BODY
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center">
                                    <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <CheckCircle size={10} /> Saved to Profile
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

            {/* Stats Modal */}
            <AnimatePresence>
                {showStatsModal && (
                    <StatsModal
                        isOpen={showStatsModal}
                        stats={statsResult}
                        onClose={() => setShowStatsModal(false)}
                        onSave={handleSaveStats}
                        saving={savingStats}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default PhotoLab;
