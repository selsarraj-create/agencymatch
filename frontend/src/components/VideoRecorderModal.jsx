import React, { useState, useRef, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { X, Mic, Square, Play, RotateCcw, Check, Upload, FileText, Video as VideoIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const VideoRecorderModal = ({ isOpen, onClose, userId, userName, userCity, userHeight, onUploadComplete }) => {
    const [isTeleprompterOpen, setTeleprompterOpen] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0); // Seconds

    const {
        status,
        startRecording,
        stopRecording,
        mediaBlobUrl,
        clearBlobUrl,
        previewStream
    } = useReactMediaRecorder({ video: true, audio: true, blobPropertyBag: { type: "video/webm" } });

    // Video Preview Ref
    const videoPreviewRef = useRef(null);

    useEffect(() => {
        if (videoPreviewRef.current && previewStream) {
            videoPreviewRef.current.srcObject = previewStream;
        }
    }, [previewStream]);

    // Timer Logic
    useEffect(() => {
        let interval;
        if (status === 'recording') {
            setRecordingTime(0);
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else if (status === 'stopped') {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Teleprompter Script
    const script = `Hi, I'm ${userName || '[Name]'}. I am ${userHeight || '[Height]'}cm tall and based in ${userCity || '[City]'}. I'm excited to apply.`;

    // Handle Upload
    const handleUpload = async () => {
        if (!mediaBlobUrl) return;
        setUploading(true);

        try {
            // 1. Fetch blob
            const blob = await fetch(mediaBlobUrl).then(r => r.blob());
            const file = new File([blob], "intro.webm", { type: "video/webm" });

            // 2. Upload to Supabase Storage
            const filePath = `users/${userId}/intro.webm`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            // Cache bust the URL
            const finalUrl = `${publicUrl}?t=${Date.now()}`;

            // 4. Update Profile
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ video_url: finalUrl })
                .eq('id', userId);

            if (dbError) throw dbError;

            onUploadComplete(finalUrl);
            onClose();

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
                <button onClick={onClose} className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white">
                    <X size={24} />
                </button>

                {/* Teleprompter Toggle */}
                {status !== 'recording' && !mediaBlobUrl && (
                    <button
                        onClick={() => setTeleprompterOpen(!isTeleprompterOpen)}
                        className={`p-2 backdrop-blur-md rounded-full transition-colors flex items-center gap-2 px-4 ${isTeleprompterOpen ? 'bg-brand-start text-white' : 'bg-black/50 text-white'}`}
                    >
                        <FileText size={18} />
                        <span className="text-xs font-bold">{isTeleprompterOpen ? 'Hide Script' : 'Show Script'}</span>
                    </button>
                )}
            </div>

            {/* Main Area */}
            <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">

                {/* Teleprompter Overlay */}
                <AnimatePresence>
                    {isTeleprompterOpen && !mediaBlobUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-24 left-4 right-4 z-20 mx-auto max-w-md pointer-events-none"
                        >
                            <div className="bg-black/60 backdrop-blur-sm p-6 rounded-3xl text-center border border-white/10 shadow-2xl">
                                <p className="text-white/80 text-sm font-bold uppercase mb-2 tracking-widest">Read This</p>
                                <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                                    "{script}"
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Video Preview / Recorder */}
                {mediaBlobUrl ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        <video src={mediaBlobUrl} controls autoPlay loop className="max-h-full max-w-full" />
                    </div>
                ) : (
                    <div className="w-full h-full relative bg-gray-900">
                        {/* Live Camera Feed */}
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>
                )}
            </div>

            {/* Footer / Controls */}
            <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-8 pb-12 flex flex-col items-center justify-center gap-6">

                {status === 'recording' && (
                    <div className="flex items-center gap-2 text-red-500 animate-pulse">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="font-mono font-bold">RECORDING {formatTime(recordingTime)}</span>
                    </div>
                )}

                <div className="flex items-center gap-8">
                    {!mediaBlobUrl ? (
                        // Recording Controls
                        status === 'recording' ? (
                            <button
                                onClick={stopRecording}
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                <div className="w-8 h-8 bg-red-500 rounded-sm" />
                            </button>
                        ) : (
                            <button
                                onClick={startRecording}
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                <div className="w-16 h-16 bg-red-500 rounded-full border-2 border-black" />
                            </button>
                        )
                    ) : (
                        // Review Controls
                        <>
                            <button
                                onClick={clearBlobUrl}
                                disabled={uploading}
                                className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors"
                            >
                                <div className="p-4 bg-white/10 rounded-full">
                                    <RotateCcw size={24} />
                                </div>
                                <span className="text-xs font-bold">Retake</span>
                            </button>

                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                            >
                                <div className="p-4 bg-green-500/20 rounded-full border border-green-500/50">
                                    {uploading ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                                </div>
                                <span className="text-xs font-bold">{uploading ? 'Uploading...' : 'Save Video'}</span>
                            </button>
                        </>
                    )}
                </div>

                <p className="text-white/30 text-xs max-w-xs text-center">
                    {uploading ? 'Please wait while we upload your intro...' : (mediaBlobUrl ? 'Review your video. Make sure you sound confident!' : 'Press the red button to start recording.')}
                </p>
            </div>
        </div>
    );
};

// Simple helper to render the stream
const LivePreview = () => {
    // Note: react-media-recorder's hook returns `previewStream` but creating a component for it is cleaner.
    // However, without the stream passed down, we need to rely on the VideoPreview component from the library 
    // OR we can just use the internal logic. 
    // Since I can't easily change the hook usage above to get the stream without refactoring, 
    // I will use a custom hook pattern in the main component if I can.

    // Actually, `useReactMediaRecorder` provides `previewStream`. Let's update the parent to use it.
    // Ideally I'd pass `previewStream` here.
    return (
        <VideoPreviewWrapper />
    );
}

const VideoPreviewWrapper = () => {
    // This is a placeholder. Real implementation needs the stream.
    // I will update the main component to use the 'render properties' or 'hooks' properly to get the default preview behavior.
    // Actually, let's just use the `VideoPreview` component if available, OR implement a simple `useEffect` ref attach.

    // HACK: Since I cannot easily get the stream from `useReactMediaRecorder` in the exact way I wrote it above (it returns `previewStream` object),
    // I will modify the main component to use a `video` element with ref.
    return (
        <div className="w-full h-full flex items-center justify-center text-white/20">
            <VideoIcon size={64} />
            <p className="absolute mt-24 text-sm font-bold">Camera Preview Loading...</p>
        </div>
    );
};


export default VideoRecorderModal;
