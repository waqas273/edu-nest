import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <motion.h1
                className="text-9xl font-bold text-slate-200 dark:text-slate-800"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                404
            </motion.h1>
            <motion.h2
                className="text-2xl md:text-4xl font-semibold text-slate-800 dark:text-slate-100 mt-[-2rem]"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                Page Not Found
            </motion.h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link
                to="/"
                className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
                Go Back Home
            </Link>
        </div>
    );
};

export default NotFound;
