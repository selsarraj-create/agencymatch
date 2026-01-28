import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, Image as ImageIcon, Loader2 } from 'lucide-react';
import axios from 'axios';

const PhotoLab = () => {
    const [user, setUser] = useState(null);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login');
            return;
        }
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

    const handleGenerate = async () => {
        if (credits < 1) {
            setError("Insufficient credits. Please top up.");
            return;
        }

        setGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const response = await axios.post(`${API_URL}/api/generate-portfolio`, {
                user_id: user.id,
                prompt: "Professional model portfolio shot, studio lighting" // Default prompt
            });

            if (response.data.status === 'success') {
                setCredits(response.data.remaining_credits);
                setGeneratedImage(response.data.mock_image_url); // Maps to backend stub
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 402) {
                setError("Insufficient credits.");
            } else {
                setError("Generation failed. Please try again.");
            }
        } finally {
            setGenerating(false);
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
        <div className="min-h-screen bg-studio-black p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Camera className="text-studio-gold" /> Photo Lab
                        </h1>
                        <p className="text-gray-400 mt-1">Generate professional portfolio shots with AI.</p>
                    </div>

                    {/* Credit Balance Card */}
                    <div className="glass-panel px-6 py-3 rounded-xl flex items-center gap-3 border border-white/10">
                        <div className="bg-studio-gold/20 p-2 rounded-full text-studio-gold">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Credits</p>
                            <p className="text-xl font-bold text-white">{credits}</p>
                        </div>
                        <button className="ml-4 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                            Top Up
                        </button>
                    </div>
                </div>

                {/* Main Action Area */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Generator Controls */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 h-fit">
                        <h2 className="text-xl font-semibold text-white mb-4">New Generation</h2>

                        <div className="space-y-4">
                            <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                                <p className="text-sm text-gray-300 mb-2">Cost: <span className="text-studio-gold font-bold">1 Credit</span></p>
                                <p className="text-xs text-gray-500">Includes high-res generation and hosting.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={generating || credits < 1}
                                className="w-full bg-studio-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed
                                         text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all 
                                         transform active:scale-[0.98]"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={20} fill="currentColor" /> Generate Portfolio Shot
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 min-h-[400px] flex items-center justify-center relative overflow-hidden">
                        {generatedImage ? (
                            <div className="processed-animation relative w-full h-full">
                                <img
                                    src={generatedImage}
                                    alt="Generated Portfolio"
                                    className="w-full h-full object-cover rounded-lg shadow-2xl"
                                />
                                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/10">
                                    AI Generated
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon size={32} />
                                </div>
                                <p>Your generated image will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoLab;
