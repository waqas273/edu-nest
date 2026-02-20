import React from 'react';
import { motion } from 'framer-motion';
import { Users, Facebook, Linkedin, Globe } from 'lucide-react';
import logo from '../assets/EduNest.png';

const Footer = ({ onOpenTeamModal }) => {
    return (
        <footer className="w-full relative bg-white dark:bg-[#020617] transition-colors duration-300">

            {/* The Signature Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="max-w-7xl mx-auto px-6 py-6 md:py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10 md:gap-0">

                    {/* LEFT: Brand Identity */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="EduNest" crossOrigin="anonymous" className="w-8 h-8 object-contain" />
                            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                EduNest
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                GIFT University Gujranwala, PAKISTAN
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                © 2024 EduNest. All rights reserved.
                            </p>
                        </div>
                    </div>

                    {/* CENTER: The Action (Meet the Team) */}
                    <motion.button
                        onClick={onOpenTeamModal}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative px-8 py-3 rounded-full border border-slate-200 dark:border-white/10 bg-transparent overflow-hidden transition-all duration-300"
                    >
                        {/* Hover Fill Effect */}
                        <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center gap-3">
                            <Users size={18} className="text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                                Meet the Team
                            </span>
                        </div>
                    </motion.button>

                    {/* RIGHT: Connect (Socials) */}
                    <div className="flex items-center gap-4">
                        {[
                            { Icon: Facebook, href: '#' },
                            { Icon: Linkedin, href: '#' },
                            { Icon: Globe, href: '#' }
                        ].map(({ Icon, href }, index) => (
                            <motion.a
                                key={index}
                                href={href}
                                whileHover={{ y: -3 }}
                                className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 transition-all duration-300 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white"
                            >
                                <Icon size={18} />
                            </motion.a>
                        ))}
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
