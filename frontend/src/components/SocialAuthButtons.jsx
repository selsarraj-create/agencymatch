import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Apple, CheckCircle2, Facebook, Smartphone } from 'lucide-react';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const TikTokIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.11-.01 1.25.02 2.5-.03 3.75-.02 1.19-.08 2.38-.25 3.56-.47 3.25-3.08 5.76-6.33 6.01-1.64.13-3.29-.15-4.75-.9-1.22-.63-2.18-1.57-2.77-2.81-.59-1.25-.66-2.67-.3-4.01.62-2.31 2.73-4.14 5.39-4.51.56-.08 1.12-.08 1.67-.02v4.25c-.24-.03-.49-.04-.73-.01-.76.08-1.39.5-1.7 1.2a2.3 2.3 0 0 0 1.25 2.86c.65.26 1.41.22 2.05-.15.42-.25.75-.63.93-1.09.19-.48.27-1 .26-1.51.01-4.9.01-9.8.01-14.7H12.525z" />
    </svg>
);

const SocialAuthButtons = () => {
    const [loading, setLoading] = useState(false);

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) {
            console.error('Error:', error.message);
            setLoading(false);
        }
    };

    const ButtonBase = ({ onClick, icon, label, bgColor, textColor, borderColor, badge }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`
                group relative flex items-center justify-between w-full 
                ${bgColor} ${textColor} ${borderColor} border
                font-bold py-4 px-6 rounded-2xl 
                active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md
                disabled:opacity-50 disabled:pointer-events-none
            `}
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="tracking-tight">{label}</span>
            </div>
            {badge && (
                <div className="bg-brand-start/10 text-brand-start p-1 rounded-full">
                    <CheckCircle2 size={16} className="fill-brand-end text-white" />
                </div>
            )}
        </button>
    );

    return (
        <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            {/* Apple - Primary */}
            <ButtonBase
                onClick={() => handleSocialLogin('apple')}
                icon={<Apple size={22} className="fill-current" />}
                label="Continue with Apple"
                bgColor="bg-text-primary-light dark:bg-white"
                textColor="text-white dark:text-black"
                borderColor="border-transparent"
            />

            {/* Google - Clean */}
            <ButtonBase
                onClick={() => handleSocialLogin('google')}
                icon={<GoogleIcon />}
                label="Continue with Google"
                bgColor="bg-card-light dark:bg-card-dark"
                textColor="text-text-primary-light dark:text-white"
                borderColor="border-gray-200 dark:border-white/10"
            />

            <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-white/10"></span></div>
                <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white dark:bg-black px-2 text-text-secondary-light dark:text-text-secondary-dark font-sans">More Options</span></div>
            </div>

            {/* TikTok - Brand Highlight */}
            <ButtonBase
                onClick={() => handleSocialLogin('tiktok')}
                icon={<TikTokIcon />}
                label="Continue with TikTok"
                badge={true}
                bgColor="bg-black dark:bg-[#111]"
                textColor="text-white"
                borderColor="border-white/10"
            />

            {/* Facebook */}
            <ButtonBase
                onClick={() => handleSocialLogin('facebook')}
                icon={<Facebook size={22} className="fill-current" />}
                label="Continue with Facebook"
                bgColor="bg-[#1877F2]/5 dark:bg-[#1877F2]/10"
                textColor="text-[#1877F2]"
                borderColor="border-[#1877F2]/20"
            />
        </div>
    );
};

export default SocialAuthButtons;
