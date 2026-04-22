import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
    { id: 'profile', label: 'Profile', numeral: 1 },
    { id: 'photos', label: 'Photos', numeral: 2 },
    { id: 'stats', label: 'Stats', numeral: 3 }
];

const OnboardingStepper = ({ currentStep }) => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    
    return (
        <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5 py-3 sm:py-4">
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between relative bg-black/20 dark:bg-white/5 p-2 rounded-full border border-gray-200/50 dark:border-white/10">
                    {/* Background line */}
                    <div className="absolute left-6 right-6 top-1/2 h-[3px] bg-gray-300 dark:bg-white/10 -z-10 -translate-y-1/2 rounded-full" />
                    
                    {/* Progress line */}
                    {currentIndex >= 0 && (
                        <div 
                            className="absolute left-6 top-1/2 h-[3px] bg-brand-start -z-10 transition-all duration-500 ease-in-out -translate-y-1/2 rounded-full" 
                            style={{ width: `calc(${(currentIndex / (STEPS.length - 1)) * 100}% - 48px)` }}
                        />
                    )}

                    {STEPS.map((step, idx) => {
                        const isCompleted = currentIndex > idx;
                        const isCurrent = currentIndex === idx;

                        return (
                            <div key={step.id} className="flex items-center gap-2 px-2 bg-surface-light dark:bg-surface-dark rounded-full">
                                <motion.div 
                                    initial={false}
                                    animate={{
                                        scale: isCurrent ? 1.05 : 1,
                                        backgroundColor: (isCompleted || isCurrent) ? '#22c55e' : '#e5e7eb',
                                        color: (isCompleted || isCurrent) ? '#000' : '#6b7280',
                                        borderColor: 'transparent'
                                    }}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-lg
                                        ${isCurrent ? 'dark:bg-brand-start dark:text-black ring-4 ring-brand-start/30 shadow-brand-start/40' : 'dark:bg-white/10 dark:text-gray-400'}
                                        ${isCompleted ? 'dark:bg-brand-start dark:text-black shadow-green-500/40' : ''}
                                    `}
                                >
                                    {isCompleted ? <Check size={20} strokeWidth={4} /> : step.numeral}
                                </motion.div>
                                
                                <span className={`text-xs sm:text-sm font-black uppercase tracking-wider pr-2
                                    ${isCurrent ? 'text-brand-start dark:text-white' : 'text-gray-500 dark:text-gray-400'}
                                `}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        {/* Spacer — adjusted for taller header */}
        <div className="h-[88px] sm:h-[104px]" />
        </>
    );
};

export default OnboardingStepper;
