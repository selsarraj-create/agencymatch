import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, Image as ImageIcon, Loader2, Upload, Sparkles, ScanFace, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const PhotoLab = () => {
    const [user, setUser] = useState(null);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState('upload'); // upload | processing | result
    const [inputImage, setInputImage] = useState(null); // URL or File
    const [generatedImage, setGeneratedImage] = useState(null);
    const [identityConstraints, setIdentityConstraints] = useState(null);
    const [error, setError] = useState(null);
    const [processingStage, setProcessingStage] = useState(''); // 'Analyzing Identity...' | 'Generating Digital...'

    const navigate = useNavigate();
    const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        setUser(user);
        fetchCredits(user.id);
    };

    const fetchCredits = async (userId) => {
        try {
            const response = await axios.get(`${API_URL}/api/credits/balance?user_id=${userId}`);
            setCredits(response.data.credits);
        } catch (err) {
            console.error("Failed to fetch credits", err);
        } finally {
            setLoading(false);
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
        if (credits < 1) { setError("Insufficient credits."); return; }
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

                // Optimistically deduct 1 credit (refresh real balance ideally)
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

    return (
        <div className="min-h-screen bg-surface-light dark:bg-surface-dark p-4 md:p-8 pb-32 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-text-primary-light dark:text-white flex items-center gap-3">
                            <Camera className="text-brand-start" size={32} /> Identity Lab
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-1 font-medium">Create strict Model Digitals from your selfies.</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-sm">
                        <div className="bg-brand-start/10 p-1.5 rounded-full text-brand-start">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-bold">Credits</p>
                            <p className="text-lg font-black text-brand-start leading-none">{credits}</p>
                        </div>
                    </div>
                </div>

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
};

export default PhotoLab;
