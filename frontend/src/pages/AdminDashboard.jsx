import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Users, Search, PlusCircle, Coins, Loader2, X, Lock } from 'lucide-react';

const AdminDashboard = () => {
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
        if (!user) {
            navigate('/login');
            return;
        }

        // Check Admin Status using robust RPC call (bypasses RLS)
        const { data: isAdmin, error } = await supabase.rpc('am_i_admin');

        console.log("Admin Check RPC:", { user: user.id, isAdmin, error });

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
            const response = await axios.get(`${API_URL}/admin/users`, {
                headers: { 'X-User-Id': adminId }
            });
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
            await axios.post(`${API_URL}/admin/credits/add`, {
                admin_id: adminUser.id,
                target_user_id: selectedUser.id,
                amount: parseInt(creditAmount)
            });

            // Refresh list
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

    const filteredUsers = users.filter(u =>
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-studio-black flex items-center justify-center text-white">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-studio-black p-4 md:p-8 relative">

            {/* Credit Modal */}
            {showCreditModal && selectedUser && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowCreditModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-1">Add Credits</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Target: <span className="text-studio-gold">{selectedUser.name !== 'N/A' ? selectedUser.name : selectedUser.email}</span>
                        </p>

                        <form onSubmit={handleAddCredits} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-semibold text-gray-500 block mb-2">Amount to Add</label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-3.5 text-studio-gold" size={18} />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={creditAmount}
                                        onChange={e => setCreditAmount(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-studio-gold"
                                        placeholder="Enter amount..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreditAmount(10)}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300"
                                >+10</button>
                                <button
                                    type="button"
                                    onClick={() => setCreditAmount(50)}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300"
                                >+50</button>
                                <button
                                    type="button"
                                    onClick={() => setCreditAmount(100)}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300"
                                >+100</button>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-studio-gold text-black font-bold py-3 rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                                {processing ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Add'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-red-500" /> Admin Console
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                navigate('/login');
                            }}
                            className="text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5"
                        >
                            Logout
                        </button>
                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full text-red-400 text-xs font-mono flex items-center gap-2">
                            <Lock size={12} /> SECURE AREA
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-center pb-6 border-b border-white/5 gap-4">
                        <div className="flex items-center gap-2 text-white text-lg font-semibold">
                            <Users size={20} className="text-gray-400" />
                            Registered Users ({filteredUsers.length})
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search email or name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-white/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-xs uppercase font-semibold text-gray-300">
                                <tr>
                                    <th className="p-4 rounded-tl-lg">User</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4 text-right rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{user.name}</div>
                                            <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white">{user.email}</div>
                                            <div className="text-xs text-gray-500">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="inline-flex items-center gap-1 bg-studio-gold/10 text-studio-gold px-3 py-1 rounded-full font-bold">
                                                <Coins size={14} /> {user.credits}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowCreditModal(true);
                                                }}
                                                className="text-white hover:text-studio-gold p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
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
            </div>
        </div>
    );
};

export default AdminDashboard;
