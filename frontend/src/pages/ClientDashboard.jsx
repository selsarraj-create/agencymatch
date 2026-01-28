import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ExternalLink, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const ClientDashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSubmissions = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // Initial Fetch
            const { data, error } = await supabase
                .from('agency_submissions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setSubmissions(data);
            setLoading(false);

            // Realtime Subscription
            const subscription = supabase
                .channel('agency_submissions_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'agency_submissions',
                    filter: `user_id=eq.${user.id}`
                }, payload => {
                    handleRealtimeUpdate(payload);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        };

        fetchSubmissions();
    }, [navigate]);

    const handleRealtimeUpdate = (payload) => {
        if (payload.eventType === 'INSERT') {
            setSubmissions(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
            setSubmissions(prev => prev.map(item =>
                item.id === payload.new.id ? payload.new : item
            ));
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'failed': return <XCircle className="text-red-500" size={20} />;
            case 'processing': return <Loader2 className="animate-spin text-studio-gold" size={20} />;
            default: return <Clock className="text-gray-500" size={20} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-studio-black flex items-center justify-center text-white">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-studio-black p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="text-studio-gold" /> Submissions
                    </h1>
                </div>

                {/* Submissions Table/List */}
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-xs uppercase font-semibold text-gray-300">
                                <tr>
                                    <th className="p-4">Agency</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Submitted At</th>
                                    <th className="p-4 text-right">Proof</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-500">
                                            No active submissions found.
                                        </td>
                                    </tr>
                                ) : (
                                    submissions.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-white">
                                                {item.agency_url}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon status={item.status} />
                                                    <span className="capitalize">{item.status}</span>
                                                </div>
                                                {item.error_message && (
                                                    <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">
                                                        {item.error_message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {new Date(item.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.proof_screenshot_url ? (
                                                    <a
                                                        href={item.proof_screenshot_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-studio-gold hover:underline text-xs"
                                                    >
                                                        View Proof <ExternalLink size={12} />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-600">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;
