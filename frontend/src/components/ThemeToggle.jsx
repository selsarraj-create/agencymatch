import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion } from 'framer-motion';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative inline-flex h-9 w-16 items-center rounded-full bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 px-0.5 transition-colors shadow-sm"
            aria-label="Toggle Theme"
        >
            <span className="sr-only">Toggle Theme</span>
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-brand-start shadow-md text-white`}
                animate={{ x: theme === "dark" ? 28 : 0 }}
            >
                {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            </motion.div>
        </button>
    );
}
