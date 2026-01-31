import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ScanFace, Check, ArrowRight, Zap, Loader2 } from 'lucide-react';
import ProcessingAnimation from './ProcessingAnimation';
import LeadForm from './LeadForm';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageUtils';

// Use /api for production (Vercel), localhost for development
const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';


const Scanner = () => {
    const [state, setState] = useState('IDLE'); // IDLE, PROCESSING, PREVIEW, COMPLETE
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showApplyForm, setShowApplyForm] = useState(false);
    const fileInputRef = useRef(null);

    // Handlers
    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setState('PROCESSING');

        try {
            setAnalysisResult(null); // Clear previous result
            const compressedFile = await compressImage(selectedFile);
            const formData = new FormData();
            formData.append('file', compressedFile);

            const response = await axios.post(`${API_URL}/analyze`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 35000
            });
            setAnalysisResult(response.data);
        } catch (error) {
            console.error("Analysis failed", error);
            let errorMessage = "Analysis failed. Please try again.";
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMessage = "Analysis is taking too long. Try a smaller image.";
            } else if (error.response?.status === 504) {
                errorMessage = "Server timeout. Please try again.";
            } else if (error.response?.status === 413) {
                errorMessage = "Image file is too large.";
            }
            alert(errorMessage);
            setState('IDLE');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            handleFileSelect(droppedFile);
        }
    };

    const onAnimationComplete = () => {
        setState((curr) => curr === 'PROCESSING' ? 'WAITING_FOR_RESULT' : curr);
    };

    useEffect(() => {
        if (state === 'WAITING_FOR_RESULT') {
            if (analysisResult) {
                if (analysisResult.error) {
                    alert(`Analysis Failed: ${analysisResult.error}`);
                    setState('IDLE');
                    return;
                }
                setState('PREVIEW');
            } else {
                const safetyTimer = setTimeout(() => {
                    if (!analysisResult) {
                        alert("Server timeout. Please try again.");
                        setState('IDLE');
                    }
                }, 30000);
                return () => clearTimeout(safetyTimer);
            }
        }
    }, [state, analysisResult]);

    const handleFormSuccess = () => {
        setState('COMPLETE');
    };

    const reset = () => {
        setState('IDLE');
        setFile(null);
        setPreviewUrl(null);
        setAnalysisResult(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto min-h-[600px] flex flex-col items-center px-4 font-sans text-text-primary-light dark:text-text-primary-dark transition-colors duration-300">

            {/* Header */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-brand-start/10 rounded-full mb-4">
                    <ScanFace size={32} className="text-brand-start" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3 leading-tight">
                    Free AI <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-start to-brand-end">Model Scout</span>
                </h1>
                <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Upload a selfie. Get analyzed. Get discovered.
                </p>
            </div>

            {/* Main Area */}
            <div className="relative w-full min-h-[500px] md:aspect-video bg-card-light dark:bg-card-dark rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden group transition-colors duration-300">

                {/* IDLE STATE */}
                {state === 'IDLE' && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-brand-start dark:hover:border-brand-start transition-colors cursor-pointer p-8 bg-gray-50/50 dark:bg-white/5"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                        />

                        <div className="w-24 h-24 rounded-full bg-brand-start/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-brand-start/20">
                            <Upload className="text-brand-start" size={40} />
                        </div>

                        <h3 className="text-2xl font-bold mb-2 text-center">Upload A Clear Selfie</h3>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-base text-center max-w-sm mb-8">
                            Drag & drop or tap to upload. We accept JPG and PNG.
                        </p>

                        <button className="px-8 py-3 bg-text-primary-light dark:bg-white text-white dark:text-black font-bold rounded-full shadow-lg active:scale-95 transition-transform">
                            Select Photo
                        </button>
                    </div>
                )}

                {/* PROCESSING STATE */}
                {(state === 'PROCESSING' || state === 'WAITING_FOR_RESULT') && (
                    <>
                        <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" alt="Scanning" />
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                            {/* Reusing existing animation component but ensuring it looks good on light/dark */}
                            <div className="bg-black/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
                                <ProcessingAnimation onComplete={onAnimationComplete} hasResult={!!analysisResult} />
                            </div>
                        </div>
                        {state === 'WAITING_FOR_RESULT' && (
                            <div className="absolute bottom-10 left-0 right-0 text-center z-50">
                                <p className="text-brand-start font-bold animate-pulse flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin" size={16} /> Finalizing Analysis...
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* PREVIEW & COMPLETE STATE */}
                {(state === 'PREVIEW' || state === 'COMPLETE') && analysisResult && (
                    <div className="flex flex-col h-full md:absolute md:inset-0 md:flex-row">
                        {/* Image Side */}
                        <div className="relative w-full md:w-1/3 h-64 md:h-full bg-black">
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Analyzed" />
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-end border border-white/10">
                                {analysisResult.market_categorization?.primary?.toUpperCase() || 'ANALYZED'}
                            </div>
                        </div>

                        {/* Results Side */}
                        <div className="flex-1 p-6 md:p-8 bg-card-light dark:bg-card-dark flex flex-col overflow-y-auto transition-colors duration-300">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight mb-1">Results</h2>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">Vision 3.0 Analysis</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand-start to-brand-end">
                                        {analysisResult.suitability_score || 0}
                                    </div>
                                    <div className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Score</div>
                                </div>
                            </div>

                            {/* Detailed Stats Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                                    <div className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Face Shape</div>
                                    <div className="font-bold text-lg">{analysisResult.face_geometry?.primary_shape || 'Analyzing...'}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                                    <div className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Jawline</div>
                                    <div className="font-bold text-lg">{analysisResult.face_geometry?.jawline_definition || 'Analyzing...'}</div>
                                </div>
                            </div>

                            <div className="mb-6 p-5 bg-brand-start/5 rounded-2xl border border-brand-start/10">
                                <span className="text-xs text-brand-start uppercase font-black tracking-wider flex items-center gap-2 mb-2">
                                    <Zap size={12} fill="currentColor" /> Structural Note
                                </span>
                                <p className="text-sm font-medium italic text-text-primary-light dark:text-text-primary-dark">"{analysisResult.face_geometry?.structural_note || 'N/A'}"</p>
                            </div>

                            {/* BLURRED SECTION (Gated Content) */}
                            <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex-grow">

                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <ScanFace size={20} className="text-brand-start" />
                                    Insider Information
                                </h3>

                                {/* The content to blur */}
                                <div className={`space-y-6 ${state === 'PREVIEW' ? 'blur-md filter select-none opacity-50' : ''}`}>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Aesthetic Audit</h4>
                                        <p className="text-sm font-medium mt-1">
                                            {analysisResult.aesthetic_audit?.lighting_quality || 'Unknown'} lighting detected.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Scout Verdict</h4>
                                        <p className="text-sm font-medium mt-1">
                                            {analysisResult.scout_feedback || 'No feedback generated.'}
                                        </p>
                                    </div>
                                </div>

                                {/* GATE OVERLAY */}
                                {state === 'PREVIEW' && (
                                    <>
                                        {!showApplyForm ? (
                                            <div className="absolute inset-0 bg-white/80 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                                                <div className="mb-4 bg-brand-start text-white p-4 rounded-full shadow-lg shadow-brand-start/30">
                                                    <Check size={32} strokeWidth={4} />
                                                </div>
                                                <h3 className="text-2xl font-black mb-2 text-text-primary-light dark:text-white">
                                                    You qualified!
                                                </h3>
                                                <p className="text-text-secondary-light dark:text-gray-300 font-medium mb-8 max-w-xs mx-auto">
                                                    Your face structure matches our agency database.
                                                </p>

                                                <button
                                                    onClick={() => setShowApplyForm(true)}
                                                    className="w-full bg-gradient-to-r from-brand-start to-brand-end text-white font-bold py-4 px-8 rounded-full text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-brand-start/40 flex items-center justify-center gap-2"
                                                >
                                                    Create Account <ArrowRight size={20} />
                                                </button>

                                            </div>
                                        ) : (
                                            <LeadForm
                                                analysisData={analysisResult}
                                                imageBlob={file}
                                                onSubmitSuccess={handleFormSuccess}
                                                onCancel={() => setShowApplyForm(false)}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Scanner;
