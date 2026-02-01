import React from 'react';

const DashboardLayout = ({ children, header }) => {
    return (
        // Container (The "Shell")
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-surface-light dark:bg-surface-dark transition-colors duration-300">

            {/* The Header (Top) */}
            {header && (
                <div className="w-full z-40 shrink-0 bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-white/5">
                    {header}
                </div>
            )}

            {/* The Main Content (The "Scroll Zone") */}
            {/* Added pb-24 to prevent content from being hidden behind Fixed Bottom Nav */}
            <main className="flex-1 overflow-y-auto pb-24 px-4 md:px-8 pt-6 scrollbar-hide">
                <div className="max-w-6xl mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
