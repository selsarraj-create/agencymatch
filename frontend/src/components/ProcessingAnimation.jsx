import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProcessingAnimation = ({ onComplete }) => {
    const [textIndex, setTextIndex] = useState(0);
    const messages = [
        "Analyzing Facial Geometry...",
        "Evaluating Symmetry...",
        "Auditing Aesthetic Markers...",
        "Cross-Referencing 2026 Trends..."
    ];

    useEffect(() => {
        // Cycle text every 2 seconds
        const textInterval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        // Complete after 4 seconds
        const completeTimeout = setTimeout(() => {
            onComplete();
        }, 4000);

        return () => {
            clearInterval(textInterval);
            clearTimeout(completeTimeout);
        };
    }, [onComplete]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-xl">
            {/* Laser Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-studio-gold shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-scan z-20"></div>

            {/* Overlay/Grid effect */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 z-10 border border-studio-gold/30 rounded-xl">
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-studio-gold"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-studio-gold"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-studio-gold"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-studio-gold"></div>
            </div>

            {/* Text Animation */}
            <div className="z-30 mt-32 md:mt-48 text-center bg-black/60 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={textIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-studio-gold font-mono text-sm tracking-widest uppercas"
                    >
                        {messages[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProcessingAnimation;
