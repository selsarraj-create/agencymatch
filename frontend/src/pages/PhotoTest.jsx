import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';
import { Upload, Loader2, ArrowRight, RotateCcw, Plus, X, Edit3, Settings2 } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000/api';

const PhotoTest = () => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [resultImage, setResultImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timing, setTiming] = useState(null);

    // Prompt engineering state
    const [systemInstruction, setSystemInstruction] = useState('');
    const [userPrompt, setUserPrompt] = useState('');
    const [defaultSystem, setDefaultSystem] = useState('');
    const [defaultPrompt, setDefaultPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(true);

    useEffect(() => {
        fetchDefaultPrompts();
    }, []);

    const fetchDefaultPrompts = async () => {
        try {
            const res = await axios.get(`${API_URL}/test-headshot-prompts`);
            if (res.data) {
                setSystemInstruction(res.data.system_instruction || '');
                setUserPrompt(res.data.user_prompt || '');
                setDefaultSystem(res.data.system_instruction || '');
                setDefaultPrompt(res.data.user_prompt || '');
            }
        } catch (err) {
            console.warn('Failed to fetch default prompts:', err);
        }
    };

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;

        const newFiles = [...files, ...selected].slice(0, 3);
        setFiles(newFiles);
        setPreviews(newFiles.map(f => URL.createObjectURL(f)));
        setResultImage(null);
        setError(null);
        setTiming(null);
        e.target.value = '';
    };

    const handleRemoveFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        setPreviews(newFiles.map(f => URL.createObjectURL(f)));
        if (!newFiles.length) {
            setResultImage(null);
        }
    };

    const handleResetPrompts = () => {
        setSystemInstruction(defaultSystem);
        setUserPrompt(defaultPrompt);
    };

    const handleGenerate = async () => {
        if (!files.length) return;
        setLoading(true);
        setError(null);
        setResultImage(null);

        const startTime = Date.now();

        try {
            const uploadedUrls = [];
            for (const file of files) {
                const cleanExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
                const fileName = `phototest/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
                const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                });
                if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }

            // Call test endpoint with multi-reference photo array AND custom editable prompts
            const response = await axios.post(`${API_URL}/test-headshot`, {
                reference_urls: uploadedUrls,
                photo_url: uploadedUrls[0],
                custom_system_instruction: systemInstruction,
                custom_user_prompt: userPrompt
            }, { timeout: 180000 });

            if (response.data.image_bytes) {
                const mime = response.data.mime_type || 'image/jpeg';
                setResultImage(`data:${mime};base64,${response.data.image_bytes}`);
            } else {
                throw new Error('No image returned');
            }

            setTiming(((Date.now() - startTime) / 1000).toFixed(1));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Generation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAll = () => {
        setFiles([]);
        setPreviews([]);
        setResultImage(null);
        setError(null);
        setTiming(null);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
                            <Settings2 className="text-green-400" size={24} />
                            Photo Lab — Staff Prompt Test Bench
                        </h1>
                        <p className="text-sm text-gray-400">
                            Upload 1 to 3 reference photos & iterate live on Gemini 3 Pro prompts. No credits, no login needed.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowPromptEditor(!showPromptEditor)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <Edit3 size={14} />
                        {showPromptEditor ? 'Hide Prompt Editor' : 'Edit Prompts'}
                    </button>
                </div>

                {/* Editable Prompt Engineering Panel */}
                {showPromptEditor && (
                    <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                                <Edit3 size={16} /> Live Prompt Workbench (Staff Iteration)
                            </h2>
                            <button
                                onClick={handleResetPrompts}
                                className="text-xs text-gray-400 hover:text-white underline font-medium"
                            >
                                Reset to Default Prompts
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* System Instruction */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-300 flex justify-between">
                                    <span>1. System Instruction (Identity & Constraints)</span>
                                </label>
                                <textarea
                                    value={systemInstruction}
                                    onChange={(e) => setSystemInstruction(e.target.value)}
                                    rows={8}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-green-500 transition-colors resize-none leading-relaxed"
                                    placeholder="Enter system instruction..."
                                />
                            </div>

                            {/* User Prompt */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-300 flex justify-between">
                                    <span>2. User Prompt (Grid Layout & Styling Rules)</span>
                                </label>
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    rows={8}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-green-500 transition-colors resize-none leading-relaxed"
                                    placeholder="Enter user prompt..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload area */}
                {previews.length < 3 && (
                    <div className="flex justify-center">
                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-colors">
                            <Plus size={18} />
                            {previews.length === 0 ? 'Upload Reference Photos (1-3)' : `Add Reference Photo (${previews.length}/3)`}
                            <input
                                id="phototest-input"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}

                {/* Previews and Result */}
                {previews.length > 0 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Input Photos */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
                                    Input References ({previews.length})
                                </p>
                                <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-2xl border border-white/10 min-h-[160px] items-center">
                                    {previews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900 border border-white/20 group">
                                            <img src={src} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => handleRemoveFile(idx)}
                                                className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full backdrop-blur-sm"
                                            >
                                                <X size={12} />
                                            </button>
                                            <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded font-bold">
                                                #{idx + 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Result */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
                                    Generated 2x2 Grid {timing && <span className="text-green-400">({timing}s)</span>}
                                </p>
                                <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center relative">
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-3 p-4 text-center">
                                            <Loader2 size={32} className="animate-spin text-green-500" />
                                            <span className="text-sm font-semibold text-gray-300">Generating 2x2 Grid (8192 Thinking Budget)...</span>
                                            <span className="text-xs text-gray-500">Locking facial geometry & skin tone across {files.length} photo(s)...</span>
                                        </div>
                                    ) : resultImage ? (
                                        <img src={resultImage} alt="Result Grid" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-500">Tap "Generate" to render with custom prompts</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded-xl p-3 text-center">
                                {error}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={handleResetAll}
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={14} /> Reset Photos
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !files.length}
                                className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center gap-2 shadow-lg"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                {loading ? 'Processing...' : resultImage ? 'Re-generate' : 'Generate'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoTest;
