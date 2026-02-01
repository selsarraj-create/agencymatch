import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Building2, Camera, ArrowRight, CheckCircle2, Star, Zap } from 'lucide-react';
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
            icon: <Building2 className="text-white" size={24} />,
            title: "Agency Match",
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
                                    Start Analysis <ArrowRight size={20} />
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

                    {/* Hero Visual - Bento Style Collage */}
                    <div className="flex-1 w-full max-w-[500px] md:max-w-none relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative z-10 grid grid-cols-2 gap-4"
                        >
                            {/* Card 1 */}
                            <div className="col-span-2 aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl relative group">
                                <img src="/assets/hero_model_collage.png" alt="Models" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
                                    <div className="bg-white/20 backdrop-blur-md self-start px-3 py-1 rounded-full text-xs font-bold text-white mb-2">
                                        Trending
                                    </div>
                                    <p className="text-white font-bold text-xl">Real People. Real Careers.</p>
                                </div>
                            </div>

                            {/* Card 2 - Stats */}
                            <div className="aspect-square rounded-3xl bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-100 dark:border-white/10 p-6 flex flex-col justify-between shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-brand-start/10 flex items-center justify-center text-brand-start">
                                    <Zap size={20} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-black dark:text-white">98%</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Match Rate</p>
                                </div>
                            </div>

                            {/* Card 3 - Image */}
                            <div className="aspect-square rounded-3xl overflow-hidden shadow-xl relative">
                                <img src="/assets/avatar_user_3.png" alt="User" className="w-full h-full object-cover" />
                                <div className="absolute bottom-3 right-3 bg-white text-black text-xs font-bold px-2 py-1 rounded-md">
                                    @scout_ai
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


            {/* Bento Grid Features */}
            <section className="py-24 bg-surface-light dark:bg-[#0a0a0a] px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-text-primary-light dark:text-white">
                            Everything you need.
                        </h2>
                        <p className="text-xl text-text-secondary-light dark:text-text-secondary-dark">
                            We simplified the entire modeling industry into one app.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-card-light dark:bg-card-dark p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-white/5 hover:shadow-xl transition-all hover:-translate-y-1 group"
                            >
                                <div className={`w-12 h-12 rounded-2xl bg-brand-start/10 text-brand-start flex items-center justify-center mb-6`}>
                                    {/* Clone icon to enforce color if needed, but text-brand-start should cascade if icons use currentColor */}
                                    {React.cloneElement(feature.icon, { className: "text-brand-start" })}
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-text-primary-light dark:text-white">{feature.title}</h3>
                                <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
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
