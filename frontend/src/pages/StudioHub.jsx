import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Play, Download, Trash2, Loader2, Sparkles, Mic } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import PhotoLab from './PhotoLab'; // Reusing existing PhotoLab
import VideoRecorderModal from '../components/VideoRecorderModal';

const StudioHub = () => {
    const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'video'
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [isRecorderOpen, setRecorderOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteVideo = async () => {
        if (!confirm("Are you sure you want to delete your video reel?")) return;
        setDeleting(true);
        try {
            const userId = profile.id;
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('videos')
                .remove([`users/${userId}/intro.webm`]);

            if (storageError) throw storageError;

            // 2. Update Profile
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ video_url: null })
                .eq('id', userId);

            if (dbError) throw dbError;

            // 3. Update Local State
            setProfile(prev => ({ ...prev, video_url: null }));
        } catch (error) {
            console.error("Error deleting video:", error);
            alert("Failed to delete video. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    // Fetch Profile for Video Data
    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data);

                // If user has 'first_name', well they don't in profile usually, it's in metadata or leads
                // But we'll try to get what we can.
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // Header with Toggle
    const StudioHeader = () => (
        <div className="flex flex-col items-center justify-center py-6 px-4">
            <h1 className="text-2xl font-black mb-6 tracking-tight">Studio Hub</h1>

            {/* Toggle Control */}
            <div className="relative flex bg-gray-100 dark:bg-white/5 p-1 rounded-full border border-gray-200 dark:border-white/10 w-full max-w-xs">
                {['photos', 'video'].map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative flex-1 py-2 text-sm font-bold transition-colors z-10 flex items-center justify-center gap-2 ${isActive ? 'text-black dark:text-white' : 'text-gray-400'}`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="studio-tab"
                                    className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-sm border border-gray-200 dark:border-white/5"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative flex items-center gap-2">
                                {tab === 'photos' ? <Camera size={16} /> : <Video size={16} />}
                                {tab === 'photos' ? 'Photo Lab' : 'Video Reel'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <DashboardLayout header={<StudioHeader />}>
            <div className="min-h-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'photos' ? (
                        <motion.div
                            key="photos"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full"
                        >
                            {/* We just render the content of PhotoLab here. 
                                Note: PhotoLab.jsx currently has its own Layout. We might need to refactor it to be a pure component 
                                OR just render it and accept double headers (not ideal).
                                
                                ideally PhotoLab should not wrap itself in DashboardLayout if used here.
                                For now, I will assume I need to fix PhotoLab to be embeddable.
                                
                                HACK: To save time, I will render PhotoLab but I need to ensure it doesn't render another DashboardLayout.
                                I'll quickly check PhotoLab.jsx content again.
                            */}
                            <PhotoLab isEmbedded={true} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="video"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 md:p-8 max-w-4xl mx-auto"
                        >
                            {loading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <div className="space-y-8">

                                    {/* Introduction Card */}
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-black">Your Personality Reel</h2>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Agencies want to hear your voice and see your personality. Record a quick 30-second intro to boost your profile.
                                        </p>
                                    </div>

                                    {profile?.video_url ? (
                                        // Active State - Video exists
                                        <div className="bg-card-light dark:bg-card-dark rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-xl">
                                            <div className="aspect-video bg-black relative group">
                                                <video src={profile.video_url} controls className="w-full h-full object-cover" />
                                            </div>
                                            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full">
                                                        <Sparkles size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold">Intro Reel Active</h3>
                                                        <p className="text-xs text-gray-500">Visible to agencies</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handleDeleteVideo}
                                                        disabled={deleting}
                                                        className="p-2 md:px-4 md:py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-center"
                                                        title="Delete Reel"
                                                    >
                                                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setRecorderOpen(true)}
                                                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 font-bold text-sm transition-colors"
                                                    >
                                                        Re-Record
                                                    </button>
                                                    <a
                                                        href={profile.video_url}
                                                        download
                                                        className="px-4 py-2 rounded-xl bg-brand-start text-white hover:bg-brand-mid font-bold text-sm transition-colors flex items-center gap-2"
                                                    >
                                                        <Download size={16} /> Download
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Empty State
                                        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl p-8 md:p-12 border border-dashed border-gray-300 dark:border-white/20 text-center flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 bg-gradient-to-tr from-brand-start to-brand-end rounded-full flex items-center justify-center shadow-lg transform rotate-3">
                                                <Video size={48} className="text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold">No Reel Recorded Yet</h3>
                                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                                    A simple "Hello" goes a long way. Use our teleprompter to record a professional intro in seconds.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setRecorderOpen(true)}
                                                className="px-8 py-4 bg-brand-start hover:bg-brand-mid text-white rounded-full font-black text-lg shadow-xl shadow-brand-start/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <Mic size={24} /> Open Studio
                                            </button>
                                        </div>
                                    )}

                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Recorder Modal */}
            <VideoRecorderModal
                isOpen={isRecorderOpen}
                onClose={() => setRecorderOpen(false)}
                userId={profile?.id}
                onUploadComplete={(url) => {
                    setProfile(prev => ({ ...prev, video_url: url }));
                    fetchProfile(); // Refresh
                }}
                userName={profile?.stage_name || 'Model'}
                userCity={profile?.city || 'London'}
                userHeight={profile?.height || ''}
            />
        </DashboardLayout>
    );
};

export default StudioHub;
