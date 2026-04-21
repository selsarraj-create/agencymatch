import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';
import { Upload, Loader2, ArrowRight, RotateCcw } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000/api';

const PhotoTest = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timing, setTiming] = useState(null);

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResultImage(null);
        setError(null);
        setTiming(null);
    };

    const handleGenerate = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResultImage(null);

        const startTime = Date.now();

        try {
            // 1. Upload to Supabase storage
            const fileName = `phototest/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);

            // 2. Call the test endpoint (no credits needed)
            const response = await axios.post(`${API_URL}/test-headshot`, {
                photo_url: publicUrl
            }, { timeout: 120000 });

            // 3. Show the result
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

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResultImage(null);
        setError(null);
        setTiming(null);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-black mb-1">Photo Lab — Test Bench</h1>
                <p className="text-sm text-gray-400 mb-8">Upload a photo → run the AI headshot pipeline → see the result. No credits, no profile needed.</p>

                {/* Upload area */}
                {!preview && (
                    <div 
                        onClick={() => document.getElementById('phototest-input').click()}
                        className="w-full max-w-sm mx-auto aspect-[3/4] rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                    >
                        <input id="phototest-input" type="file" accept="image/jpeg,image/png" onChange={handleFileSelect} className="hidden" />
                        <Upload size={32} className="text-gray-400" />
                        <span className="text-sm text-gray-400 font-medium">Tap to upload a test photo</span>
                    </div>
                )}

                {/* Before / After comparison */}
                {preview && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Before */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">Input</p>
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black border border-white/10">
                                    <img src={preview} alt="Input" className="w-full h-full object-cover" />
                                </div>
                            </div>

                            {/* After */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
                                    Result {timing && <span className="text-green-400">({timing}s)</span>}
                                </p>
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={28} className="animate-spin text-brand-start" />
                                            <span className="text-xs text-gray-400">Generating...</span>
                                        </div>
                                    ) : resultImage ? (
                                        <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-500">Waiting...</span>
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
                                onClick={handleReset}
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center gap-2"
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
