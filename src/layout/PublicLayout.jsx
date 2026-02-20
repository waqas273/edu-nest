import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import UniversalHeader from '../components/ui/UniversalHeader';
import Footer from '../components/Footer';

const PublicLayout = () => {
    const location = useLocation();
    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
            <AnimatedBackground />
            <UniversalHeader />

            <main className="flex-grow flex flex-col relative z-10 pt-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex-grow flex flex-col"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
            <Footer />
        </div>
    );
};

export default PublicLayout;
