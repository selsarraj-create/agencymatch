import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, User, Sparkles } from 'lucide-react';

const MobileBottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    // --- Route Guard Logic ---
    // Hidden on Landing, Login, Scanner, Onboarding, Forgot Password
    const hiddenRoutes = ['/', '/login', '/scan', '/forgot-password'];

    // Check exact matches or startsWith for sub-routes
    const isHidden =
        hiddenRoutes.includes(pathname) ||
        pathname.startsWith('/onboarding');

    if (isHidden) return null;

    // --- Navigation Items ---
    const navItems = [
        {
            name: 'Home',
            path: '/dashboard',
            icon: Briefcase,
            isActive: pathname === '/dashboard' || pathname === '/dashboard/applications'
        },
        {
            name: 'Studio',
            path: '/photo-lab',
            icon: Sparkles,
            isPrimary: true, // Brand color tint
            isActive: pathname === '/photo-lab'
        },
        {
            name: 'Profile',
            path: '/dashboard', // Links to dashboard...
            query: '?tab=profile', // ...with tab param
            icon: User,
            isActive: pathname === '/dashboard' && location.search.includes('tab=profile')
        }
    ];

    const handleNavigation = (item) => {
        if (item.query) {
            // Force reload if we are already on dashboard but want to switch tabs
            // Or just navigate with search params
            navigate({
                pathname: item.path,
                search: item.query
            });
        } else {
            navigate(item.path);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 w-full z-50 md:hidden pb-safe">
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 h-16 flex items-center justify-around px-2 pb-2 pt-1 transition-all">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    // Active state logic (simplified for the map)
                    // We need to check both path and query for the Profile tab logic to be distinct from Home
                    const active = item.name === 'Profile'
                        ? (pathname === '/dashboard' && location.search.includes('tab=profile'))
                        : (item.name === 'Home'
                            ? (pathname === '/dashboard' && !location.search.includes('tab=profile'))
                            : item.isActive);

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavigation(item)}
                            className={`flex-1 flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${active
                                    ? 'text-black dark:text-white'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className={`relative p-1 rounded-xl transition-colors ${active && 'bg-gray-100 dark:bg-white/10'}`}>
                                <Icon
                                    size={24}
                                    className={`${item.isPrimary ? 'text-brand-start' : ''} ${active ? 'fill-current' : ''}`}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                            </div>
                            <span className="text-[10px] font-bold tracking-wide">{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileBottomNav;
