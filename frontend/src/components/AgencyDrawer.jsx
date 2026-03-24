import React from 'react';
import { X, ExternalLink, CheckCircle2, AlertTriangle, MapPin, Calendar, Ruler, Instagram, Globe, Info } from 'lucide-react';

/**
 * Mapping from selector-map field names → human-readable labels.
 */
const FIELD_LABELS = {
    firstName: 'First Name', lastName: 'Last Name', email: 'Email',
    phone: 'Phone', dateOfBirth: 'Date of Birth', gender: 'Gender',
    height: 'Height', bust: 'Bust/Chest', waist: 'Waist', hips: 'Hips',
    shoeSize: 'Shoe Size', eyeColor: 'Eye Colour', hairColor: 'Hair Colour',
    instagramHandle: 'Instagram', aboutMe: 'Bio/About', photoUpload: 'Photos',
    city: 'City/Location', nationality: 'Nationality', ethnicity: 'Ethnicity',
    tiktokHandle: 'TikTok', dressSize: 'Dress Size',
};

const FIELD_TO_PROFILE = {
    firstName: 'first_name', lastName: 'last_name', email: 'email',
    phone: 'phone_number', dateOfBirth: 'date_of_birth', gender: 'gender',
    height: 'height_cm', bust: 'bust_cm', waist: 'waist_cm', hips: 'hips_cm',
    shoeSize: 'shoe_size_uk', eyeColor: 'eye_color', hairColor: 'hair_color',
    instagramHandle: 'instagram_handle', aboutMe: 'bio',
    city: 'city', nationality: 'nationality', ethnicity: 'ethnicity',
    tiktokHandle: 'tiktok_handle', dressSize: 'dress_size',
};

const SKIP = ['submitButton', 'termsCheckbox', 'howDidYouHear', 'age'];

export default function AgencyDrawer({ agency, userProfile, onClose }) {
    if (!agency) return null;

    const selectors = agency.selector_map?.selectors || agency.selector_map;

    // Build required fields list with user status
    const requiredFields = [];
    if (selectors) {
        for (const [field, sel] of Object.entries(selectors)) {
            if (!sel || SKIP.includes(field)) continue;
            const label = FIELD_LABELS[field] || field;
            const profileKey = FIELD_TO_PROFILE[field];
            const filled = profileKey ? !!userProfile?.[profileKey] : true;
            requiredFields.push({ field, label, filled, isPhoto: field === 'photoUpload' });
        }
    }

    const filledCount = requiredFields.filter(f => f.filled).length;
    const totalCount = requiredFields.length;
    const missingCount = totalCount - filledCount;

    // Height/age requirements
    const g = (userProfile?.gender || '').toLowerCase();
    const heightMin = (g === 'm' || g === 'male') ? agency.height_min_cm_m : agency.height_min_cm_f;
    const userHeight = userProfile?.height_cm ? parseInt(userProfile.height_cm) : null;
    const userAge = userProfile?.date_of_birth
        ? Math.floor((Date.now() - new Date(userProfile.date_of_birth).getTime()) / 31557600000)
        : null;

    const heightOk = !heightMin || !userHeight || userHeight >= heightMin;
    const ageOk = !agency.age_min || !userAge || (userAge >= agency.age_min && userAge <= (agency.age_max || 99));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-white/10 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-text-primary-light dark:text-white truncate pr-4">{agency.name}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="px-6 py-6 space-y-6">
                    {/* Agency Identity */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {agency.image_url ? (
                                <img src={agency.image_url} alt={agency.name} className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-2xl font-black text-brand-start">{agency.name.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1">
                                <MapPin size={12} />
                                {agency.location || 'London, UK'}
                            </p>
                            {agency.category && (
                                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-brand-start/10 text-brand-start px-2 py-0.5 rounded-md">
                                    {agency.category}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Booking Status */}
                    {agency.has_vacancies && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl px-4 py-3">
                            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                            <span className="text-sm font-bold text-green-700 dark:text-green-400">Actively Booking New Talent</span>
                        </div>
                    )}

                    {/* Match Status */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Your Match</h3>
                        <div className="space-y-2">
                            {/* Height */}
                            {heightMin ? (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                                    heightOk
                                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                }`}>
                                    <Ruler size={14} />
                                    Min height: {heightMin}cm
                                    {userHeight && (
                                        <span className="ml-auto text-xs opacity-70">You: {userHeight}cm</span>
                                    )}
                                    {heightOk ? <CheckCircle2 size={14} className="ml-1" /> : <AlertTriangle size={14} className="ml-1" />}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark">
                                    <Ruler size={14} />
                                    No height requirement
                                </div>
                            )}

                            {/* Age */}
                            {agency.age_min ? (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                                    ageOk
                                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                }`}>
                                    <Calendar size={14} />
                                    Age range: {agency.age_min}–{agency.age_max || '∞'}
                                    {userAge && (
                                        <span className="ml-auto text-xs opacity-70">You: {userAge}</span>
                                    )}
                                    {ageOk ? <CheckCircle2 size={14} className="ml-1" /> : <AlertTriangle size={14} className="ml-1" />}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark">
                                    <Calendar size={14} />
                                    No age requirement
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modeling Types */}
                    {agency.modeling_types && agency.modeling_types.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Represents</h3>
                            <div className="flex flex-wrap gap-2">
                                {agency.modeling_types.map((type, idx) => (
                                    <span key={idx} className="text-xs font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Required Fields for Application */}
                    {requiredFields.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Application Fields</h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    missingCount === 0
                                        ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                                        : 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400'
                                }`}>
                                    {missingCount === 0 ? '✓ All filled' : `${missingCount} missing`}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${missingCount === 0 ? 'bg-green-500' : 'bg-orange-500'}`}
                                    style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                                {requiredFields.map(({ field, label, filled, isPhoto }) => (
                                    <div
                                        key={field}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                                            filled
                                                ? 'bg-green-50 dark:bg-green-500/5 text-green-700 dark:text-green-400'
                                                : 'bg-orange-50 dark:bg-orange-500/5 text-orange-700 dark:text-orange-400'
                                        }`}
                                    >
                                        {filled ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Links */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Links</h3>
                        <div className="space-y-2">
                            {agency.application_url && (
                                <a
                                    href={agency.application_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-brand-start hover:bg-brand-start/5 transition-colors"
                                >
                                    <Globe size={16} />
                                    View Application Page
                                    <ExternalLink size={12} className="ml-auto opacity-50" />
                                </a>
                            )}
                            {agency.website_url && agency.website_url !== agency.application_url && (
                                <a
                                    href={agency.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-text-primary-light dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <ExternalLink size={16} />
                                    Visit Website
                                    <ExternalLink size={12} className="ml-auto opacity-50" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
