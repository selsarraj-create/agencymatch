import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit2, Trash2, X, Save, Search, Loader2, Globe, CheckCircle } from 'lucide-react';

const AdminAgencyManager = () => {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAgency, setEditingAgency] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        website_url: '',
        application_url: '',
        location: 'London, UK',
        status: 'active',
        logo_url: '',
        modeling_types: [],
        has_vacancies: false
    });

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('agencies')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setAgencies(data || []);
        } catch (error) {
            console.error("Error fetching agencies:", error);
            alert("Failed to load agencies.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (agency) => {
        setEditingAgency(agency);
        setFormData({
            name: agency.name,
            website_url: agency.website_url || '',
            application_url: agency.application_url || '',
            location: agency.location || 'London, UK',
            status: agency.status || 'active',
            logo_url: agency.logo_url || '',
            modeling_types: agency.modeling_types || [],
            has_vacancies: agency.has_vacancies || false
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingAgency(null);
        setFormData({
            name: '',
            website_url: '',
            application_url: '',
            location: 'London, UK',
            status: 'active',
            logo_url: '',
            modeling_types: [],
            has_vacancies: false
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this agency?")) return;
        try {
            const { error } = await supabase.from('agencies').delete().eq('id', id);
            if (error) throw error;
            setAgencies(agencies.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting agency:", error);
            alert("Failed to delete agency.");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingAgency) {
                // Update
                const { error } = await supabase
                    .from('agencies')
                    .update(formData)
                    .eq('id', editingAgency.id);
                if (error) throw error;
                setAgencies(agencies.map(a => a.id === editingAgency.id ? { ...a, ...formData } : a));
            } else {
                // Create
                const { data, error } = await supabase
                    .from('agencies')
                    .insert([formData])
                    .select();
                if (error) throw error;
                if (data) setAgencies([...agencies, data[0]]);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving agency:", error);
            alert("Failed to save agency.");
        } finally {
            setSaving(false);
        }
    };

    // Helper for modeling types input (comma separated)
    const handleTypesChange = (e) => {
        const val = e.target.value;
        const types = val.split(',').map(t => t.trim()).filter(t => t);
        setFormData({ ...formData, modeling_types: types });
    };

    const filteredAgencies = agencies.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 text-text-secondary-light dark:text-text-secondary-dark" size={16} />
                    <input
                        type="text"
                        placeholder="Search agencies..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-brand-start transition-all"
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-brand-start text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-end transition-colors flex items-center gap-2 text-sm shadow-md active:scale-95"
                >
                    <Plus size={16} /> Add Agency
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-start" /></div>
            ) : (
                <div className="bg-card-light dark:bg-card-dark rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredAgencies.map((agency) => (
                                    <tr key={agency.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            {agency.logo_url && <img src={agency.logo_url} className="w-8 h-8 rounded-lg object-contain bg-white border" alt="" />}
                                            {agency.name}
                                            {agency.has_vacancies && <span className="ml-2 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Hiring</span>}
                                        </td>
                                        <td className="p-4 text-text-secondary-light dark:text-text-secondary-dark">{agency.location}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${agency.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {agency.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(agency)} className="p-2 hover:bg-brand-start/10 hover:text-brand-start rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(agency.id)} className="p-2 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingAgency ? 'Edit Agency' : 'Add New Agency'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Name</label>
                                    <input required className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Location</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Website URL</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.website_url} onChange={e => setFormData({ ...formData, website_url: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Application URL</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.application_url} onChange={e => setFormData({ ...formData, application_url: e.target.value })} />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold uppercase mb-1">Logo URL</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.logo_url} onChange={e => setFormData({ ...formData, logo_url: e.target.value })} />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold uppercase mb-1">Modeling Types (comma separated)</label>
                                    <input
                                        className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border"
                                        value={formData.modeling_types.join(', ')}
                                        onChange={handleTypesChange}
                                        placeholder="Fashion, Commercial, Men..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Status</label>
                                    <select className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="col-span-1 md:col-span-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                    <input
                                        type="checkbox"
                                        id="has_vacancies"
                                        checked={formData.has_vacancies}
                                        onChange={e => setFormData({ ...formData, has_vacancies: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-brand-start focus:ring-brand-start"
                                    />
                                    <label htmlFor="has_vacancies" className="text-sm font-bold cursor-pointer select-none">
                                        Has Vacancies / Hiring
                                        <span className="block text-xs text-text-secondary-light dark:text-text-secondary-dark font-normal">Check this to highlight agency on client dashboard</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-brand-start text-white font-bold py-3 rounded-xl hover:bg-brand-end transition-colors flex items-center justify-center gap-2 mt-4"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Agency</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAgencyManager;
