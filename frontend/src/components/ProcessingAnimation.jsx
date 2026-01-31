import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProcessingAnimation = ({ onComplete, hasResult }) => {
    const [textIndex, setTextIndex] = useState(0);
    const messages = [
        "Analyzing Facial Geometry...",
        "Evaluating Symmetry...",
        "Auditing Aesthetic Markers...",
        "Cross-Referencing 2026 Trends..."
    ];

    useEffect(() => {
        // Cycle text every 1.2 seconds
        const textInterval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % messages.length);
        }, 1200);

        return () => clearInterval(textInterval);
    }, []);

    useEffect(() => {
        if (hasResult) {
            onComplete();
            return;
        }

        const timeout = setTimeout(() => {
            if (!hasResult) {
                console.warn("ProcessingAnimation timed out without result");
                onComplete();
            }
        }, 15000);

        return () => clearTimeout(timeout);
    }, [hasResult, onComplete]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-3xl">
            {/* Laser Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-start shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan z-20"></div>

            {/* Overlay/Grid effect */}
            <div className="absolute inset-0 z-10 border-4 border-brand-start/50 rounded-3xl box-border m-4">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-start -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-start -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-start -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-start -mb-1 -mr-1"></div>
            </div>

            {/* Text Animation */}
            <div className="z-30 relative text-center bg-black/80 px-8 py-4 rounded-full backdrop-blur-md border border-white/20 shadow-2xl mt-12">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={textIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-brand-start font-black text-sm tracking-widest uppercase flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-brand-start animate-ping" /> {messages[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProcessingAnimation;
