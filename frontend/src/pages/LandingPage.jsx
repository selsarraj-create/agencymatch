import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Building2, Camera, ArrowRight, CheckCircle2, Star, Zap, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

const LandingPage = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/scan');
    };

    const features = [
        {
            icon: <ScanFace className="text-white" size={24} />,
            title: "AI Analysis",
            desc: "Instant breakdown of your features using pro-grade computer vision.",
            color: "bg-blue-500"
        },
        {
            icon: <Briefcase className="text-white" size={24} />,
            title: "Smart Castings",
            desc: "Direct access to paid modeling jobs matched specifically to your profile.",
            color: "bg-green-500"
        },
        {
            icon: <Building2 className="text-white" size={24} />,
            title: "Agency Scout",
            desc: "We match your specific look with 50+ top agencies looking for you.",
            color: "bg-purple-500"
        },
        {
            icon: <Camera className="text-white" size={24} />,
            title: "Portfolio Lab",
            desc: "Generate professional composite cards without the photoshoot cost.",
            color: "bg-pink-500"
        }
    ];

    return (
        <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark font-sans transition-colors duration-300">

            {/* Navbar / Top Control */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">

                    {/* Hero Text */}
                    <div className="flex-1 text-center md:text-left z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm mb-8">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-start opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-start"></span>
                                </span>
                                <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-start to-brand-end">
                                    The #1 Modeling App
                                </span>
                            </div>

                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
                                Launch Your <br className="hidden md:block" />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-start to-brand-end">
                                    Modelling Career
                                </span>
                            </h1>

                            <p className="text-xl text-text-secondary-light dark:text-text-secondary-dark max-w-lg mx-auto md:mx-0 mb-10 font-medium leading-relaxed">
                                Stop guessing. Use AI to analyze your potential, match with agencies, and get signed. Fast.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                                <button
                                    onClick={handleStart}
                                    className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-brand-start to-brand-end text-white font-bold text-lg rounded-full shadow-lg shadow-brand-start/30 hover:shadow-brand-start/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Start Free Scan <ArrowRight size={20} />
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full md:w-auto px-10 py-5 bg-white dark:bg-white/5 text-text-primary-light dark:text-white border border-gray-200 dark:border-white/10 font-bold text-lg rounded-full hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all"
                                >
                                    Login
                                </button>
                            </div>

                            <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-brand-start" /> No Credit Card
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-brand-start" /> Instant Results
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Hero Visual - App Utility Mockup */}
                    <div className="flex-1 w-full max-w-[500px] md:max-w-none relative flex justify-center py-10 md:py-0">
                        {/* Background Blobs */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-start/20 blur-[80px] rounded-full pointer-events-none animate-pulse-slow" />
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />

                        {/* Floating Notification Pill */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1, duration: 0.8 }}
                            className="absolute top-10 -right-4 md:right-0 z-20 bg-white/90 dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-float-delayed"
                        >
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-text-primary-light dark:text-white">@Sarah just matched</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">with Ford Models</p>
                            </div>
                        </motion.div>

                        {/* iPhone Mockup */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative z-10 w-[280px] h-[580px] bg-black rounded-[50px] border-[8px] border-gray-900 shadow-2xl overflow-hidden ring-1 ring-white/10 animate-float"
                        >
                            {/* Dynamic Island */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 h-[26px] w-[90px] bg-black z-30 rounded-full pointer-events-none" />

                            {/* Screen Content */}
                            <div className="relative w-full h-full bg-gray-900">
                                {/* Selfie Image */}
                                <img
                                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop"
                                    alt="User Scan"
                                    className="w-full h-full object-cover opacity-90"
                                />

                                {/* Dark Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                {/* UI Elements Overlay */}
                                <div className="absolute top-4 left-6 right-6 flex justify-between text-white text-[10px] font-medium z-20 opacity-80">
                                    <span>9:41</span>
                                    <div className="flex gap-1 items-center">
                                        <div className="w-3 h-3 border border-white rounded-[2px]" /> {/* Battery */}
                                    </div>
                                </div>

                                {/* Analysis Result Card Inside Phone */}
                                <div className="absolute bottom-6 left-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl z-20 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg leading-tight">Commercial Face</p>
                                            <p className="text-green-400 text-sm font-bold">88% Match</p>
                                        </div>
                                    </div>
                                    {/* Phone Stats Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/30 rounded-xl p-2 text-center">
                                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Symmetry</p>
                                            <p className="text-white font-bold text-sm">92%</p>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-2 text-center">
                                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Skin</p>
                                            <p className="text-white font-bold text-sm">Clear</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Logo Marquee */}
            <div className="w-full overflow-hidden py-12 border-y border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <div className="relative flex overflow-x-hidden group">
                    {/* Fast Infinite Scroll */}
                    <motion.div
                        className="flex gap-16 items-center whitespace-nowrap px-16"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
                    >
                        {/* Repeat Logos Twice for seamless loop */}
                        {[...Array(2)].map((_, i) => (
                            <React.Fragment key={i}>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">ELITE</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">IMG MODELS</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">FORD</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">NEXT</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">WILHELMINA</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">STORM</span>
                                <span className="text-3xl font-black text-text-primary-light/20 dark:text-white/20 uppercase">SELECT</span>
                            </React.Fragment>
                        ))}
                    </motion.div>
                </div>
            </div>


            {/* Bento Grid Features - Control Center */}
            <section className="py-24 bg-surface-light dark:bg-[#0a0a0a] px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-text-primary-light dark:text-white">
                            Everything you need.
                        </h2>
                        <p className="text-xl text-text-secondary-light dark:text-text-secondary-dark">
                            We simplified the entire modeling industry into one app.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Card 1: AI Analysis (Full Width on Mobile, 2 Cols on Desktop) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="col-span-2 aspect-[2/1] md:aspect-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-xl shadow-blue-500/5 dark:shadow-black/50 p-8 relative overflow-hidden group hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300"
                        >
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                                    <ScanFace size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-bold dark:text-white mb-2">AI Analysis</h3>
                                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-xs">
                                        Instant breakdown of your features using pro-grade computer vision.
                                    </p>
                                </div>
                            </div>
                            {/* Ghost Icon */}
                            <ScanFace className="absolute -bottom-4 -right-4 w-24 h-24 text-gray-900 dark:text-white opacity-5 rotate-[-15deg] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500" />
                        </motion.div>

                        {/* Card 2: Smart Castings (Square) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="col-span-1 aspect-square bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-xl shadow-blue-500/5 dark:shadow-black/50 p-6 relative overflow-hidden group hover:border-green-500/50 hover:shadow-green-500/20 active:scale-[0.98] transition-all duration-300"
                        >
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold dark:text-white leading-tight mb-1">Smart<br />Castings</h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">
                                        Direct access to paid modeling jobs.
                                    </p>
                                </div>
                            </div>
                            <Briefcase className="absolute -bottom-4 -right-4 w-20 h-20 text-gray-900 dark:text-white opacity-5 rotate-[-15deg] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500" />
                        </motion.div>

                        {/* Card 3: Agency Match (Square) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="col-span-1 aspect-square bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-xl shadow-blue-500/5 dark:shadow-black/50 p-6 relative overflow-hidden group hover:border-purple-500/50 hover:shadow-purple-500/20 active:scale-[0.98] transition-all duration-300"
                        >
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold dark:text-white leading-tight mb-1">Agency<br />Scout</h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">
                                        Match with 50+ top agencies.
                                    </p>
                                </div>
                            </div>
                            <Building2 className="absolute -bottom-4 -right-4 w-20 h-20 text-gray-900 dark:text-white opacity-5 rotate-[-15deg] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500" />
                        </motion.div>

                        {/* Card 4: Portfolio Lab (Wide Banner on Mobile, 2 Cols on Desktop) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="col-span-2 md:col-span-3 lg:col-span-2 aspect-[2/1] md:aspect-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-xl shadow-blue-500/5 dark:shadow-black/50 p-8 relative overflow-hidden group hover:border-pink-500/50 hover:shadow-pink-500/20 transition-all duration-300"
                        >
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
                                    <Camera size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-bold dark:text-white mb-2">Portfolio Lab</h3>
                                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-xs">
                                        Generate professional composite cards without the photoshoot cost.
                                    </p>
                                </div>
                            </div>
                            <Camera className="absolute -bottom-4 -right-4 w-24 h-24 text-gray-900 dark:text-white opacity-5 rotate-[-15deg] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 bg-white dark:bg-black px-4 border-t border-gray-100 dark:border-white/5">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 tracking-tight text-text-primary-light dark:text-white">
                        Don't take our word for it.
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Testimonial 1 */}
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-3xl border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <img src="/assets/avatar_user_1.png" alt="Sarah" className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-text-primary-light dark:text-white">Sarah Jenkins</p>
                                    <p className="text-xs text-brand-start font-bold">SIGNED WITH FORD</p>
                                </div>
                            </div>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark italic">
                                "I spent years sending emails to agencies and hearing nothing. One scan with Agency Scout and I realized my digitals were the problem. Fixed them, and got signed in 2 weeks."
                            </p>
                            <div className="flex gap-1 mt-6 text-yellow-400">
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-3xl border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <img src="/assets/avatar_user_2.png" alt="Marcus" className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-text-primary-light dark:text-white">Marcus Chen</p>
                                    <p className="text-xs text-brand-start font-bold">SIGNED WITH ELITE</p>
                                </div>
                            </div>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark italic">
                                "The AI feedback was brutally honest but exactly what I needed. It told me which market I actually fit in. I stopped wasting time applying to commercial agencies and focused on high fashion."
                            </p>
                            <div className="flex gap-1 mt-6 text-yellow-400">
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-3xl border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <img src="/assets/avatar_user_4.png" alt="Priya" className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-text-primary-light dark:text-white">Priya Patel</p>
                                    <p className="text-xs text-brand-start font-bold">SIGNED WITH IMG</p>
                                </div>
                            </div>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark italic">
                                "The Portfolio Lab saved me £500. I needed clean digitals for my application but couldn't afford a photographer. The AI generated exactly what the agencies asked for."
                            </p>
                            <div className="flex gap-1 mt-6 text-yellow-400">
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                                <Star fill="currentColor" size={16} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-text-primary-light dark:text-white">
                        Your face is your <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-start to-brand-end">
                            Superpower.
                        </span>
                    </h2>
                    <button
                        onClick={handleStart}
                        className="px-12 py-6 bg-text-primary-light dark:bg-white text-white dark:text-black font-bold text-xl rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                    >
                        Start Free Scan
                    </button>
                    <p className="mt-8 text-sm text-text-secondary-light dark:text-text-secondary-dark font-semibold">
                        Join 10,000+ models scanned this week.
                    </p>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
