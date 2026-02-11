import React, { useState } from 'react';
import { MapPin, Calendar, CheckCircle, AlertTriangle, ExternalLink, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const CastingCard = ({ casting, userProfile }) => {
    // Smart Match Logic
    const userHeight = userProfile?.height ? parseInt(userProfile.height) : 0;
    const minH = casting.height_min || 0;
    const maxH = casting.height_max || 250;

    // Check Gender (Simple check)
    // Gender req: 'female', 'male', 'all'
    // User gender: 'Female', 'Male' (Capitalized usually in DB)
    const genderMatch = casting.gender_req === 'all' ||
        (userProfile?.gender && userProfile.gender.toLowerCase() === casting.gender_req.toLowerCase());

    const heightMatch = userHeight >= minH && userHeight <= maxH;

    const [applied, setApplied] = useState(casting.applied || false);
    const [loading, setLoading] = useState(false);

    // Use local check if already applied (from prop or state)
    // Note: Parent feed should ideally pass 'applied' status if we fetch it there.
    // For now we assume the feed might not have it populated yet, or we handle it here.

    const handleApply = async (e) => {
        e.preventDefault();
        if (!userProfile?.id) return;

        setLoading(true);

        try {
            // 1. Track in DB
            const { error } = await supabase.from('applications_tracking').insert({
                user_id: userProfile.id,
                casting_id: casting.id,
                status: 'applied'
            });

            if (error) {
                // If unique violation, just ignore (already applied)
                if (error.code !== '23505') throw error;
            }

            setApplied(true);

            // 2. Open Link/Email
            if (casting.apply_method === 'link') {
                window.open(casting.apply_contact, '_blank');
            } else {
                window.location.href = `mailto:${casting.apply_contact}?subject=Application for ${casting.title}`;
            }

        } catch (err) {
            console.error("Application tracking failed:", err);
            alert("Failed to record application. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    // Overall Fit
    const isGoodMatch = heightMatch && genderMatch;

    return (
        <div className="bg-white dark:bg-card-dark rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">

            {/* Background Glow for Match */}
            {isGoodMatch && (
                <div className="absolute top-0 right-0 p-20 bg-green-500/5 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    {casting.brand_logo_url ? (
                        <img src={casting.brand_logo_url} alt={casting.brand_name} className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-white/10" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <Briefcase size={20} className="text-gray-400" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-lg leading-tight line-clamp-1">{casting.title}</h3>
                        <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">{casting.brand_name}</p>
                    </div>
                </div>

                {/* Match Badge */}
                {userProfile ? (
                    isGoodMatch ? (
                        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-500/30">
                            <CheckCircle size={12} />
                            You Fit
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 dark:border-yellow-500/20">
                            <AlertTriangle size={12} />
                            {!heightMatch ? 'Height Mismatch' : 'Gender Mismatch'}
                        </div>
                    )
                ) : null}
            </div>

            {/* Pill Tags */}
            <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 border border-gray-100 dark:border-white/5">
                    <MapPin size={10} /> {casting.location}
                </span>
                {casting.date_range && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 border border-gray-100 dark:border-white/5">
                        <Calendar size={10} /> {casting.date_range}
                    </span>
                )}
                {(casting.height_min > 0 || casting.height_max > 0) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 border border-gray-100 dark:border-white/5">
                        Height: {casting.height_min}-{casting.height_max}cm
                    </span>
                )}
            </div>

            <div className="flex items-end justify-between relative z-10">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 mb-0.5">Rate</span>
                    <span className="text-xl font-black text-green-600 dark:text-green-400">{casting.rate}</span>
                </div>

                {applied ? (
                    <button
                        disabled
                        className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-not-allowed border border-green-200 dark:border-green-500/30"
                    >
                        <CheckCircle size={14} /> Applied
                    </button>
                ) : (
                    <button
                        onClick={handleApply}
                        disabled={loading}
                        className="bg-text-primary-light dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:scale-100"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : (casting.apply_method === 'link' ? 'Apply' : 'Email')}
                        {!loading && <ExternalLink size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CastingCard;
