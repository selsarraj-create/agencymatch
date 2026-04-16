import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
    { id: 'profile', label: 'Basic Profile', numeral: 1 },
    { id: 'photos', label: 'Digital Portfolio', numeral: 2 },
    { id: 'stats', label: 'Final Measurements', numeral: 3 }
];

const OnboardingStepper = ({ currentStep }) => {
    // Find index, default to 0 if not found (e.g. at matches)
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    
    return (
        <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-white/5 py-4">
            <div className="w-full max-w-3xl mx-auto px-4">
            <div className="flex items-center justify-between relative">
                {/* Background line */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 dark:bg-white/10 -z-10" />
                
                {/* Progress line */}
                {currentIndex >= 0 && (
                    <div 
                        className="absolute left-0 top-1/2 h-0.5 bg-brand-start -z-10 transition-all duration-500 ease-in-out" 
                        style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
                    />
                )}

                {STEPS.map((step, idx) => {
                    const isCompleted = currentIndex > idx;
                    const isCurrent = currentIndex === idx;
                    const isUpcoming = currentIndex < idx;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 px-2">
                            <motion.div 
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.1 : 1,
                                    backgroundColor: isCompleted ? '#22c55e' : isCurrent ? '#000' : '#f3f4f6',
                                    color: (isCompleted || isCurrent) ? '#fff' : '#9ca3af',
                                    borderColor: isCurrent ? '#22c55e' : 'transparent'
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                                    ${isCurrent ? 'dark:bg-white dark:text-black border-2 border-brand-start' : 'dark:bg-white/10 dark:text-gray-400'}
                                    ${isCompleted ? 'dark:bg-brand-start dark:text-black' : ''}
                                `}
                            >
                                {isCompleted ? <Check size={16} /> : step.numeral}
                            </motion.div>
                            
                            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:block
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
        {/* Spacer to push page content below the fixed header */}
        <div className="h-20 sm:h-24" />
        </>
    );
};

export default OnboardingStepper;
