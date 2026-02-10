import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Sparkles, User, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const DesktopSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    // --- Route Guard Logic ---
    const hiddenRoutes = ['/', '/login', '/scan', '/forgot-password'];
    const isHidden = hiddenRoutes.includes(pathname) || pathname.startsWith('/onboarding');

    if (isHidden) return null;

    const navItems = [
        {
            name: 'Overview',
            path: '/dashboard',
            icon: LayoutDashboard,
            isActive: pathname === '/dashboard' && !location.search.includes('tab=profile')
        },
        {
            name: 'Studio Hub',
            path: '/studio',
            icon: Sparkles,
            isActive: pathname === '/studio' || pathname === '/photo-lab'
        },
        {
            name: 'Profile',
            path: '/dashboard',
            query: '?tab=profile',
            icon: User,
            isActive: pathname === '/dashboard' && location.search.includes('tab=profile')
        }
    ];

    const handleNavigation = (item) => {
        if (item.query) {
            navigate({ pathname: item.path, search: item.query });
        } else {
            navigate(item.path);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="hidden md:flex flex-col w-64 bg-surface-light dark:bg-black border-r border-gray-200 dark:border-white/10 h-full shrink-0">
            {/* Logo Area */}
            <div className="p-6">
                <h1 className="text-2xl font-black tracking-tighter text-brand-start">AGENCY SCOUT</h1>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-widest">Model Dashboard</p>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-2 py-4">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => handleNavigation(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${item.isActive
                            ? 'bg-brand-start/10 text-brand-start font-bold'
                            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                            }`}
                    >
                        <item.icon
                            size={20}
                            className={item.isActive ? 'text-brand-start' : 'group-hover:text-black dark:group-hover:text-white transition-colors'}
                        />
                        <span>{item.name}</span>
                        {item.isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-start" />}
                    </button>
                ))}
            </nav>

            {/* Footer / Sign Out */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-bold"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default DesktopSidebar;
