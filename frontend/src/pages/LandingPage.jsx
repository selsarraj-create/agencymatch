import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Building2, Camera, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/scan');
    };

    const features = [
        {
            icon: <ScanFace className="text-studio-gold" size={32} />,
            title: "AI Face Analysis",
            desc: "Get an instant, professional breakdown of your facial features and modeling potential using advanced computer vision."
        },
        {
            icon: <Building2 className="text-studio-gold" size={32} />,
            title: "Agency Matching",
            desc: "Don't guess. We match your specific look with over 50 top UK agencies that are actively looking for models like you."
        },
        {
            icon: <Camera className="text-studio-gold" size={32} />,
            title: "Portfolio Lab",
            desc: "Generate professional composite cards and portfolio shots instantly without paying for expensive photographers."
        }
    ];

    const steps = [
        "Upload a selfie",
        "Get instant analysis",
        "Apply to matched agencies"
    ];

    return (
        <div className="min-h-screen bg-studio-black text-white selection:bg-studio-gold selection:text-black font-sans">

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden px-4 sm:px-6 lg:px-8">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-studio-gold/10 rounded-full blur-[100px] -z-10" />

                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">

                    {/* Hero Text */}
                    <div className="flex-1 text-center md:text-left space-y-8 z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
                                <span className="text-studio-gold text-xs font-bold tracking-wider uppercase">✨ The New Standard in Modeling</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                                Discover Your <span className="text-studio-gold">Model Potential</span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-xl mx-auto md:mx-0 leading-relaxed">
                                Stop guessing. Use our industrial-grade AI to analyze your look, match with top agencies, and launch your career in minutes.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="flex flex-col sm:flex-row items-center md:justify-start justify-center gap-4"
                        >
                            <button
                                onClick={handleStart}
                                className="group relative px-8 py-4 bg-studio-gold text-black font-bold text-lg rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center gap-2"
                            >
                                Start Free Analysis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-colors"
                            >
                                Agency Login
                            </button>
                        </motion.div>

                        <div className="pt-4 flex items-center md:justify-start justify-center gap-8 text-gray-500 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-studio-gold" />
                                <span>No Credit Card</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-studio-gold" />
                                <span>Instant Results</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image Collage */}
                    <div className="flex-1 w-full max-w-[500px] md:max-w-none relative">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="relative z-10"
                        >
                            <div className="aspect-[4/5] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                <img
                                    src="/assets/hero_model_collage.png"
                                    alt="Diverse group of high fashion models"
                                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-6 left-6 z-20">
                                    <p className="text-white font-bold text-lg">Real People. Real Careers.</p>
                                    <p className="text-white/60 text-sm">Join the diverse face of fashion.</p>
                                </div>
                            </div>
                        </motion.div>
                        {/* Decorative elements behind image */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 border border-studio-gold/20 rounded-full" />
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-studio-gold/10 rounded-full blur-xl" />
                    </div>
                </div>
            </section>

            {/* Diverse Faces Strip (New Section) */}
            <section className="py-0 border-y border-white/5 bg-white/5 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <img
                        src="/assets/diverse_faces_strip.png"
                        alt="Diverse models of all ages and sizes"
                        className="w-full h-auto opacity-70 grayscale hover:grayscale-0 transition-all duration-700"
                    />
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-[#0f0f0f] border-t border-white/5 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-16">Everything you need to <span className="text-studio-gold">get signed</span></h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-8 rounded-2xl bg-studio-black border border-white/10 hover:border-studio-gold/50 transition-colors group"
                            >
                                <div className="w-14 h-14 rounded-full bg-studio-gold/10 flex items-center justify-center mb-6 group-hover:bg-studio-gold/20 transition-colors">
                                    {feature.icon}

                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Steps */}
            <section className="py-20 px-4 relative overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        {steps.map((step, i) => (
                            <div key={i} className="flex flex-col items-center text-center max-w-[200px]">
                                <div className="w-12 h-12 rounded-full border-2 border-studio-gold text-studio-gold flex items-center justify-center font-bold text-xl mb-4 bg-black/50 backdrop-blur-xl">
                                    {i + 1}
                                </div>
                                <p className="text-lg font-medium text-white">{step}</p>
                            </div>
                        ))}
                        {/* Connecting Line (Desktop) */}
                        <div className="absolute top-6 left-20 right-20 h-0.5 bg-gradient-to-r from-transparent via-studio-gold/30 to-transparent -z-10 hidden md:block" />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 text-center px-4">
                <div className="max-w-3xl mx-auto bg-gradient-to-b from-white/5 to-transparent p-12 rounded-3xl border border-white/10">
                    <Star className="text-studio-gold w-12 h-12 mx-auto mb-6" fill="currentColor" />
                    <h2 className="text-4xl font-bold mb-6">Ready to find your agency?</h2>
                    <p className="text-xl text-gray-400 mb-8">
                        Join thousands of aspiring models who found representation through AgencyMatch.
                    </p>
                    <button
                        onClick={handleStart}
                        className="px-10 py-5 bg-white text-black font-bold text-xl rounded-full hover:bg-studio-gold transition-colors shadow-xl"
                    >
                        Analyze My Face Now
                    </button>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
