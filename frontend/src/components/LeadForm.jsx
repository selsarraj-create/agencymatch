import React, { useState } from 'react';
import { Lock, CheckCircle, Smartphone, Mail, User, X, Key } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const LeadForm = ({ analysisData, imageBlob, onSubmitSuccess, onCancel }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        age: '',
        gender: '',
        email: '',
        password: '', // New Field
        phone: '',
        city: '',
        zip_code: '',
        wants_assessment: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const validateForm = () => {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError("Please enter a valid email address.");
            return false;
        }

        // UK Phone validation
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            setError("Please enter a valid UK phone number.");
            return false;
        }

        // Postcode Validation
        const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
        if (!postcodeRegex.test(formData.zip_code)) {
            setError("Please enter a valid UK Postcode.");
            return false;
        }

        // Password Validation
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }

        return true;
    };

    // Campaign Code Logic
    const TARGET_CITIES = {
        'London': { code: '#LONFB3', lat: 51.5074, lon: -0.1278 },
        'Manchester': { code: '#MANFB3', lat: 53.4808, lon: -2.2426 },
        'Birmingham': { code: '#BIRFB3', lat: 52.4862, lon: -1.8904 },
        'Glasgow': { code: '#GLAFB3', lat: 55.8642, lon: -4.2518 },
        'Bristol': { code: '#BRIFB3', lat: 51.4545, lon: -2.5879 }
    };

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const calculateCampaignCode = async (postcode, age, gender) => {
        try {
            const response = await axios.get(`https://api.postcodes.io/postcodes/${postcode}`);
            const result = response.data.result;
            const userLat = result.latitude;
            const userLon = result.longitude;
            const cityName = result.admin_district || result.parliamentary_constituency || "UK";

            let nearestCity = null;
            let minDistance = Infinity;

            for (const [city, data] of Object.entries(TARGET_CITIES)) {
                const distance = getDistanceFromLatLonInKm(userLat, userLon, data.lat, data.lon);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCity = data.code;
                }
            }
            const cityCode = nearestCity || '#LONFB3';
            const ageNum = parseInt(age);
            let ageCode = '1';
            if (ageNum >= 35 && ageNum <= 44) ageCode = '2';
            if (ageNum >= 45) ageCode = '3';
            const genderCode = gender === 'Female' ? 'F' : 'M';
            return { code: `${cityCode}${ageCode}${genderCode}`, city: cityName };

        } catch (error) {
            console.error("Error calculating campaign code:", error);
            throw new Error("Invalid Postcode");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            // 1. Calculate Campaign Info
            const { code: campaignCode, city: detectedCity } = await calculateCampaignCode(
                formData.zip_code,
                formData.age,
                formData.gender
            );

            // 2. Supabase Signup
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        age: formData.age,
                        gender: formData.gender,
                        city: detectedCity,
                        zip_code: formData.zip_code,
                        campaign_code: campaignCode,
                        metrics: analysisData?.face_geometry, // Store scout metrics
                        initial_score: analysisData?.suitability_score
                    }
                }
            });

            if (authError) throw authError;

            // 3. Submit Lead Data (Legacy/Backup)
            // Even though we have Auth, keeping leads table as master record for now
            const payload = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'city' && key !== 'password') {
                    payload.append(key, formData[key]);
                }
            });
            payload.append('city', detectedCity);
            payload.append('campaign', campaignCode);
            payload.append('analysis_data', JSON.stringify(analysisData));
            if (imageBlob) payload.append('file', imageBlob);

            // Link to user if created (optional, if you added user_id to leads)
            if (authData.user) {
                payload.append('user_id', authData.user.id);
            }

            const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';
            await axios.post(`${API_URL}/lead`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 4. Success & Tracking
            if (window.fbq) window.fbq('track', 'CompleteRegistration'); // Updated event

            onSubmitSuccess(); // Parent callback
            navigate('/dashboard'); // Redirect to Dashboard

        } catch (err) {
            console.error(err);
            if (err.message === "Invalid Postcode") {
                setError("Invalid Postcode. Please enter a valid UK Postcode.");
            } else {
                setError(err.message || "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl relative">
                    {/* Close Button */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 z-50"
                            type="button"
                        >
                            <X size={24} />
                        </button>
                    )}
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-studio-gold/20 mb-4 text-studio-gold">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Create Your Account
                        </h2>
                        <p className="text-gray-400 text-sm mt-2">
                            Save your scan results and start your journey.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 px-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="Jane"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Last Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 px-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Age *</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 px-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="25"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Gender *</label>
                                <select
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 px-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors appearance-none"
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="" disabled>Select</option>
                                    <option value="Female">Female</option>
                                    <option value="Male">Male</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Email Address *</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="jane@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Password *</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Phone Number *</label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="tel"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                    placeholder="07700 900000"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Postcode *</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3.5 px-4 text-white text-base focus:outline-none focus:border-studio-gold transition-colors"
                                placeholder="SW1A 1AA"
                                value={formData.zip_code}
                                onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 bg-studio-gold hover:bg-yellow-600 text-black font-bold py-4 text-lg rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                            {loading ? "Creating Account..." : "Confirm & Create"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadForm;
