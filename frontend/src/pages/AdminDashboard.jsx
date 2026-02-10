import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Users, Search, PlusCircle, Coins, Loader2, X, Lock } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

import AdminAgencyManager from '../components/AdminAgencyManager'; // Import the new component

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'agencies'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminUser, setAdminUser] = useState(null);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [creditAmount, setCreditAmount] = useState(0);
    const [processing, setProcessing] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }

        const { data: isAdmin, error } = await supabase.rpc('am_i_admin');
        if (error || !isAdmin) {
            console.warn("Access Denied: Not an admin", isAdmin);
            navigate('/dashboard');
            return;
        }
        setAdminUser(user);
        fetchUsers(user.id);
    };

    const fetchUsers = async (adminId) => {
        try {
            const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
            const response = await axios.get(`${API_URL}/admin/users`, { headers: { 'X-User-Id': adminId } });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            alert("Failed to load user list");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCredits = async (e) => {
        e.preventDefault();
        if (!selectedUser || !adminUser) return;
        setProcessing(true);
        try {
            const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
            await axios.post(`${API_URL}/admin/credits/add`, { admin_id: adminUser.id, target_user_id: selectedUser.id, amount: parseInt(creditAmount) });
            await fetchUsers(adminUser.id);
            setShowCreditModal(false);
            setCreditAmount(0);
            alert(`Successfully added ${creditAmount} credits to ${selectedUser.name || selectedUser.email}`);
        } catch (error) {
            console.error("Credit update failed:", error);
            alert("Failed to add credits.");
        } finally {
            setProcessing(false);
        }
    };

    const filteredUsers = users.filter(u => (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) || (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())));

    if (loading) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" size={32} /></div>;

    return (
        <div className="min-h-screen bg-surface-light dark:bg-surface-dark p-4 md:p-8 relative transition-colors duration-300 font-sans text-text-primary-light dark:text-text-primary-dark">

            {/* Credit Modal */}
            {showCreditModal && selectedUser && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={() => setShowCreditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold mb-1">Add Credits</h3>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6">
                            Target: <span className="text-brand-start font-bold">{selectedUser.name !== 'N/A' ? selectedUser.name : selectedUser.email}</span>
                        </p>

                        <form onSubmit={handleAddCredits} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark block mb-2">Amount to Add</label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-3.5 text-brand-start" size={18} />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={creditAmount}
                                        onChange={e => setCreditAmount(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand-start focus:ring-1 focus:ring-brand-start transition-all"
                                        placeholder="Enter amount..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                {[10, 50, 100].map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setCreditAmount(amt)}
                                        className="px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs font-bold transition-colors"
                                    >+{amt}</button>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-brand-start text-white font-bold py-3 rounded-xl hover:bg-brand-end transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95"
                            >
                                {processing ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Add'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20">
                            <Shield size={24} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Admin Console</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full text-red-500 text-xs font-mono flex items-center gap-2 font-bold uppercase tracking-wider">
                            <Lock size={12} /> Secure Area
                        </div>
                        <button
                            onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
                            className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded-full flex gap-1 border border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <Users size={16} className="inline mr-2" /> Users
                        </button>
                        <button
                            onClick={() => setActiveTab('agencies')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'agencies' ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <Shield size={16} className="inline mr-2" /> Agencies
                        </button>
                    </div>
                </div>

                {activeTab === 'agencies' ? (
                    <AdminAgencyManager />
                ) : (
                    <div className="bg-card-light dark:bg-card-dark p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-center pb-6 border-b border-gray-100 dark:border-white/5 gap-4">
                            <div className="flex items-center gap-2 text-lg font-bold">
                                <Users size={20} className="text-text-secondary-light dark:text-text-secondary-dark" />
                                Registered Users ({filteredUsers.length})
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-3 text-text-secondary-light dark:text-text-secondary-dark" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search email or name..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-brand-start transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">
                                    <tr>
                                        <th className="p-4 rounded-tl-lg">User</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Credits</th>
                                        <th className="p-4 text-right rounded-tr-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold">{user.name}</div>
                                                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-mono opacity-70">ID: {user.id.slice(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <div>{user.email}</div>
                                                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="inline-flex items-center gap-1 bg-brand-start/10 text-brand-start px-3 py-1 rounded-full font-black border border-brand-start/20">
                                                    <Coins size={14} /> {user.credits}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowCreditModal(true); }}
                                                    className="text-text-primary-light dark:text-white hover:text-brand-start p-2 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                                                    title="Add Credits"
                                                >
                                                    <PlusCircle size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// End of file
export default AdminDashboard;
