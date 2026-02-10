import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit2, Trash2, X, Save, Search, Loader2, Calendar, MapPin, DollarSign, Image as ImageIcon } from 'lucide-react';

const AdminCastingManager = () => {
    const [castings, setCastings] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCasting, setEditingCasting] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        agency_id: '',
        location: 'London, UK',
        description: '',
        requirements: '', // Text area, split by newlines for JSON
        date: '',
        wage: '',
        image_url: '',
        status: 'open'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Castings
            const { data: castingsData, error: castingsError } = await supabase
                .from('castings')
                .select('*, agencies(name)') // Join to get agency name
                .order('created_at', { ascending: false });

            if (castingsError) throw castingsError;

            // Fetch Agencies for Dropdown
            const { data: agenciesData, error: agenciesError } = await supabase
                .from('agencies')
                .select('id, name')
                .order('name');

            if (agenciesError) throw agenciesError;

            setCastings(castingsData || []);
            setAgencies(agenciesData || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Failed to load castings data.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (casting) => {
        setEditingCasting(casting);
        setFormData({
            title: casting.title,
            agency_id: casting.agency_id || '',
            location: casting.location || '',
            description: casting.description || '',
            requirements: Array.isArray(casting.requirements) ? casting.requirements.join('\n') : casting.requirements || '',
            date: casting.date || '',
            wage: casting.wage || '',
            image_url: casting.image_url || '',
            status: casting.status || 'open'
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingCasting(null);
        setFormData({
            title: '',
            agency_id: agencies.length > 0 ? agencies[0].id : '',
            location: 'London, UK',
            description: '',
            requirements: '',
            date: '',
            wage: '',
            image_url: '',
            status: 'open'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this casting?")) return;
        try {
            const { error } = await supabase.from('castings').delete().eq('id', id);
            if (error) throw error;
            setCastings(castings.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting casting:", error);
            alert("Failed to delete casting.");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Process requirements text to array
            const reqArray = formData.requirements.split('\n').filter(line => line.trim() !== '');

            const payload = {
                ...formData,
                requirements: reqArray
            };

            if (editingCasting) {
                // Update
                const { error } = await supabase
                    .from('castings')
                    .update(payload)
                    .eq('id', editingCasting.id);
                if (error) throw error;
                // Optimistic update or refresh
                fetchData();
            } else {
                // Create
                const { error } = await supabase
                    .from('castings')
                    .insert([payload]);
                if (error) throw error;
                fetchData();
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving casting:", error);
            alert("Failed to save casting.");
        } finally {
            setSaving(false);
        }
    };

    const filteredCastings = castings.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 text-text-secondary-light dark:text-text-secondary-dark" size={16} />
                    <input
                        type="text"
                        placeholder="Search castings..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-brand-start transition-all"
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-brand-start text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-end transition-colors flex items-center gap-2 text-sm shadow-md active:scale-95"
                >
                    <Plus size={16} /> Add Casting
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
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Agency</th>
                                    <th className="p-4">Date/Loc</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredCastings.map((casting) => (
                                    <tr key={casting.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold">
                                            {casting.title}
                                            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-normal truncate max-w-[200px]">{casting.description}</div>
                                        </td>
                                        <td className="p-4 text-text-secondary-light dark:text-text-secondary-dark">
                                            {casting.agencies?.name || 'Unknown'}
                                        </td>
                                        <td className="p-4 text-xs">
                                            <div className="flex items-center gap-1"><Calendar size={12} /> {casting.date}</div>
                                            <div className="flex items-center gap-1 mt-1 text-text-secondary-light dark:text-text-secondary-dark"><MapPin size={12} /> {casting.location}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${casting.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {casting.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(casting)} className="p-2 hover:bg-brand-start/10 hover:text-brand-start rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(casting.id)} className="p-2 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors">
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
                            <h3 className="text-xl font-bold">{editingCasting ? 'Edit Casting' : 'Add New Casting'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold uppercase mb-1">Title</label>
                                    <input required className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Campaign Face" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Agency</label>
                                    <select
                                        className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border"
                                        value={formData.agency_id}
                                        onChange={e => setFormData({ ...formData, agency_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Agency...</option>
                                        {agencies.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Status</label>
                                    <select className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="open">Open</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Location</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Date</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} placeholder="e.g. July 2024" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Wage / Rate</label>
                                    <input className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border" value={formData.wage} onChange={e => setFormData({ ...formData, wage: e.target.value })} placeholder="e.g. £500/day" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Casting Image</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                                                <ImageIcon size={16} />
                                                Choose Image
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;

                                                        // Upload logic
                                                        try {
                                                            const fileExt = file.name.split('.').pop();
                                                            const fileName = `${Math.random()}.${fileExt}`;
                                                            const filePath = `${fileName}`;

                                                            const { error: uploadError } = await supabase.storage
                                                                .from('casting-images')
                                                                .upload(filePath, file);

                                                            if (uploadError) throw uploadError;

                                                            const { data: { publicUrl } } = supabase.storage
                                                                .from('casting-images')
                                                                .getPublicUrl(filePath);

                                                            setFormData({ ...formData, image_url: publicUrl });
                                                        } catch (error) {
                                                            console.error("Upload error:", error);
                                                            alert("Failed to upload image. Make sure the 'casting-images' bucket exists (run scripts/setup_storage.sql).");
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {formData.image_url && (
                                                <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                                                    <Loader2 size={12} className="hidden" /> Uploaded!
                                                </span>
                                            )}
                                        </div>
                                        {formData.image_url && (
                                            <div className="w-full h-32 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden relative group border border-gray-200 dark:border-white/10">
                                                <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            type="hidden"
                                            value={formData.image_url}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold uppercase mb-1">Description</label>
                                    <textarea
                                        className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border min-h-[80px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of the role..."
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold uppercase mb-1">Requirements (One per line)</label>
                                    <textarea
                                        className="w-full p-2 rounded-xl bg-gray-50 dark:bg-black/20 border min-h-[100px]"
                                        value={formData.requirements}
                                        onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                        placeholder="Min height 175cm&#10;Aged 18-25&#10;London based"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-brand-start text-white font-bold py-3 rounded-xl hover:bg-brand-end transition-colors flex items-center justify-center gap-2 mt-4"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Casting</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCastingManager;
