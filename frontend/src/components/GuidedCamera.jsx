import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, ChevronRight, RotateCcw, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POSES = [
    { id: 'front', label: 'Look Straight Ahead', icon: '😐', instruction: 'Face the camera directly with a neutral expression' },
    { id: 'left', label: 'Turn Head Left', icon: '👈', instruction: 'Slowly turn your head to the left' },
    { id: 'right', label: 'Turn Head Right', icon: '👉', instruction: 'Slowly turn your head to the right' },
];

const COUNTDOWN_SECS = 3;

const GuidedCamera = ({ onComplete, onCancel }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [currentPose, setCurrentPose] = useState(0);
    const [countdown, setCountdown] = useState(null);
    const [captures, setCaptures] = useState([]); // array of blob URLs
    const [flash, setFlash] = useState(false);
    const [done, setDone] = useState(false);

    // Start camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => setCameraReady(true);
                }
            } catch (err) {
                console.error('Camera access denied:', err);
                setCameraError('Camera access denied. Please allow camera permissions and try again.');
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Capture photo from video
    const capturePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return null;

        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center-crop + mirror (front camera)
        ctx.save();
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        ctx.restore();

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.92);
        });
    }, []);

    // Start countdown for current pose
    const startCapture = useCallback(() => {
        setCountdown(COUNTDOWN_SECS);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            // Take photo
            setFlash(true);
            setTimeout(() => setFlash(false), 200);

            capturePhoto().then((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setCaptures(prev => {
                        const next = [...prev, { blob, url, pose: POSES[currentPose].id }];

                        if (next.length >= POSES.length) {
                            // All done
                            setTimeout(() => setDone(true), 400);
                        } else {
                            // Next pose
                            setTimeout(() => setCurrentPose(p => p + 1), 600);
                        }
                        return next;
                    });
                }
                setCountdown(null);
            });
            return;
        }

        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, currentPose, capturePhoto]);

    // When done, pass the front-facing capture back
    const handleConfirm = () => {
        const frontCapture = captures.find(c => c.pose === 'front');
        if (frontCapture && onComplete) {
            // Create a File object from the blob for the existing upload flow
            const file = new File([frontCapture.blob], 'selfie_front.jpg', { type: 'image/jpeg' });
            onComplete(file, captures);
        }
    };

    const handleRetake = () => {
        setCaptures([]);
        setCurrentPose(0);
        setCountdown(null);
        setDone(false);
    };

    // Camera error state
    if (cameraError) {
        return (
            <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                        <Camera size={32} className="text-red-400" />
                    </div>
                    <p className="text-white font-bold text-lg">Camera Unavailable</p>
                    <p className="text-gray-400 text-sm max-w-xs">{cameraError}</p>
                    <button onClick={onCancel} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Done — show captures
    if (done) {
        return (
            <div className="fixed inset-0 z-[300] bg-black flex flex-col">
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-white font-bold text-lg">Your Photos</h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
                        {captures.map((cap, i) => (
                            <div key={i} className="relative rounded-2xl overflow-hidden aspect-square border-2 border-green-500/50">
                                <img src={cap.url} alt={POSES[i]?.label} className="w-full h-full object-cover" />
                                <div className="absolute bottom-1 left-1 right-1 text-center">
                                    <span className="text-[9px] font-bold uppercase bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                        {POSES[i]?.label}
                                    </span>
                                </div>
                                {i === 0 && (
                                    <div className="absolute top-1 right-1">
                                        <span className="text-[8px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">PRIMARY</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 pb-8 space-y-3 max-w-lg mx-auto w-full">
                    <button
                        onClick={handleConfirm}
                        className="w-full py-4 bg-brand-start hover:bg-brand-mid text-white rounded-2xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-start/30 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={20} /> Use These Photos
                    </button>
                    <button
                        onClick={handleRetake}
                        className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} /> Retake
                    </button>
                </div>
            </div>
        );
    }

    // Live camera view
    return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onCancel} className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Progress indicator */}
            <div className="absolute top-4 left-4 right-16 z-50">
                <div className="flex gap-2">
                    {POSES.map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                                i < captures.length ? 'bg-green-400'
                                    : i === currentPose ? 'bg-white'
                                        : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Camera feed */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Flash effect */}
                <AnimatePresence>
                    {flash && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-white z-40"
                        />
                    )}
                </AnimatePresence>

                {/* Countdown overlay */}
                <AnimatePresence>
                    {countdown !== null && countdown > 0 && (
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 z-30 flex items-center justify-center"
                        >
                            <div className="w-24 h-24 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                                <span className="text-5xl font-black text-white">{countdown}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Face guide circle */}
                {cameraReady && countdown === null && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                        <div className="w-56 h-72 rounded-[50%] border-2 border-white/30 border-dashed" />
                    </div>
                )}

                {/* Loading camera */}
                {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                        <Loader2 size={32} className="animate-spin text-white" />
                    </div>
                )}
            </div>

            {/* Bottom controls */}
            <div className="bg-black/90 backdrop-blur-md px-4 py-6 pb-8 space-y-4">
                {/* Pose instruction */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-2xl">{POSES[currentPose].icon}</span>
                        <h3 className="text-white font-bold text-lg">{POSES[currentPose].label}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">{POSES[currentPose].instruction}</p>
                    <p className="text-gray-500 text-xs mt-1">Photo {currentPose + 1} of {POSES.length}</p>
                </div>

                {/* Capture button */}
                <div className="flex justify-center">
                    <button
                        onClick={startCapture}
                        disabled={!cameraReady || countdown !== null}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="w-16 h-16 rounded-full bg-white group-hover:bg-gray-200 transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidedCamera;
