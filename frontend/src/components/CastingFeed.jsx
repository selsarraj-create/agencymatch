import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Clapperboard } from 'lucide-react';
import CastingCard from './CastingCard';

const CastingFeed = ({ userProfile, filters }) => {
    const [castings, setCastings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appliedIds, setAppliedIds] = useState(new Set());

    useEffect(() => {
        const fetchCastingsAndApplications = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                let localAppliedIds = new Set(); // Use a local variable for immediate use

                // 1. Fetch User Applications if user exists
                if (user) {
                    const { data: apps, error: appsError } = await supabase
                        .from('applications_tracking')
                        .select('casting_id')
                        .eq('user_id', user.id);

                    if (appsError) throw appsError;

                    if (apps) {
                        localAppliedIds = new Set(apps.map(a => a.casting_id));
                        setAppliedIds(localAppliedIds); // Update state for rendering CastingCard
                    }
                }

                // 2. Fetch Castings
                let query = supabase
                    .from('castings')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (filters?.onlyApplied) {
                    // If filtering for "My Applications", only fetch castings that the user has applied to.
                    // If localAppliedIds is empty, no need to query, just return empty.
                    if (localAppliedIds.size === 0) {
                        setCastings([]);
                        setLoading(false);
                        return;
                    }
                    query = query.in('id', Array.from(localAppliedIds));
                }

                const { data, error } = await query;
                if (error) throw error;

                setCastings(data || []);

            } catch (err) {
                console.error("Error fetching castings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCastingsAndApplications();
    }, [filters?.onlyApplied]); // Re-run effect when onlyApplied filter changes

    if (loading) {
        return (
            <div className="py-20 flex justify-center text-gray-400">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (castings.length === 0) {
        return (
            <div className="py-20 text-center text-gray-400 bg-card-light dark:bg-card-dark rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <Clapperboard size={32} className="mx-auto mb-4 opacity-50" />
                {filters?.onlyApplied ? 'You have not applied to any castings yet.' : 'No casting calls available right now.'}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-bold">
                    {filters?.onlyApplied ? 'My Applications' : 'Open Castings'}
                    <span className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm ml-2">({castings.length})</span>
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {castings.map(casting => (
                    <CastingCard
                        key={casting.id}
                        casting={{ ...casting, applied: appliedIds.has(casting.id) }}
                        userProfile={userProfile}
                    />
                ))}
            </div>
        </div>
    );
};

export default CastingFeed;
