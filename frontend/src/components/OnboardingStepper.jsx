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
        <div className="fixed top-0 left-0 right-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5 py-2 sm:py-3">
            <div className="w-full max-w-3xl mx-auto px-6">
                <div className="flex items-center justify-between relative">
                    {/* Background line */}
                    <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-gray-200 dark:bg-white/10 -z-10 -translate-y-1/2" />
                    
                    {/* Progress line */}
                    {currentIndex >= 0 && (
                        <div 
                            className="absolute left-0 top-1/2 h-[2px] bg-brand-start -z-10 transition-all duration-500 ease-in-out -translate-y-1/2" 
                            style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
                        />
                    )}

                    {STEPS.map((step, idx) => {
                        const isCompleted = currentIndex > idx;
                        const isCurrent = currentIndex === idx;

                        return (
                            <div key={step.id} className="flex items-center gap-1.5 px-1">
                                <motion.div 
                                    initial={false}
                                    animate={{
                                        scale: isCurrent ? 1.05 : 1,
                                        backgroundColor: isCompleted ? '#22c55e' : isCurrent ? '#000' : '#f3f4f6',
                                        color: (isCompleted || isCurrent) ? '#fff' : '#9ca3af',
                                        borderColor: isCurrent ? '#22c55e' : 'transparent'
                                    }}
                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0
                                        ${isCurrent ? 'dark:bg-white dark:text-black border-2 border-brand-start' : 'dark:bg-white/10 dark:text-gray-400'}
                                        ${isCompleted ? 'dark:bg-brand-start dark:text-black' : ''}
                                    `}
                                >
                                    {isCompleted ? <Check size={12} /> : step.numeral}
                                </motion.div>
                                
                                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider
                                    ${isCurrent ? 'text-brand-start dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                                `}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        {/* Spacer — compact on mobile */}
        <div className="h-12 sm:h-16" />
        </>
    );
};

export default OnboardingStepper;
