import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import TeamModal from '../components/TeamModal';
import { Menu } from 'lucide-react';

const MainLayout = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-[#020617] transition-colors duration-300">

            {/* Sidebar - Fixed Left on Desktop, Slide-Over on Mobile */}
            <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

            {/* Main Content Area - Takes Remaining Space */}
            {/* 
                On desktop (md+): 
                - Sidebar is fixed at left-4 with w-64 (256px) 
                - We need ml-[calc(256px+16px+16px)] = ml-[288px] to account for:
                    - Sidebar width (256px)
                    - Left padding of sidebar (16px)
                    - Gap between sidebar and content (16px)
                Simplified: md:ml-72 (288px) gives enough room
            */}
            <div className="flex-1 flex flex-col min-h-screen md:ml-72 overflow-hidden">

                {/* Mobile Header - Hamburger Menu */}
                <header className="sticky top-0 z-30 px-4 py-3 flex items-center md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-white/5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white"
                    >
                        <Menu size={22} />
                    </motion.button>
                    <span className="ml-4 font-bold text-slate-800 dark:text-white">Menu</span>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:p-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="w-full"
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer - Now inside scrollable area */}
                    <Footer onOpenTeamModal={() => setIsTeamModalOpen(true)} />
                </main>
            </div>

            {/* Team Modal */}
            <TeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
        </div>
    );
};

export default MainLayout;
