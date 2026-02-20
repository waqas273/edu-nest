import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, UserPlus, Bell, Database } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Settings = () => {
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        allowRegistrations: true,
        emailNotifications: true,
        autoApproveStudents: true
    });

    const toggleSetting = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const SettingToggle = ({ label, description, icon: Icon, settingKey, color }) => (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-white/20 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="text-white" size={24} />
                </div>
                <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
                </div>
            </div>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSetting(settingKey)}
                className={`relative w-14 h-8 rounded-full transition-colors ${settings[settingKey] ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
            >
                <motion.div
                    animate={{ x: settings[settingKey] ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                />
            </motion.button>
        </div>
    );

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                    <SettingsIcon className="mr-3 text-purple-500 dark:text-purple-400" size={36} />
                    System Settings
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Configure system-wide preferences and controls</p>
            </motion.div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Controls */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <GlassCard>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Shield className="mr-2 text-orange-500 dark:text-orange-400" size={20} />
                            System Controls
                        </h3>
                        <div className="space-y-4">
                            <SettingToggle
                                label="Maintenance Mode"
                                description="Disable access for all non-admin users"
                                icon={Shield}
                                settingKey="maintenanceMode"
                                color="from-orange-500 to-red-500"
                            />
                            <SettingToggle
                                label="Allow New Registrations"
                                description="Enable or disable new user sign-ups"
                                icon={UserPlus}
                                settingKey="allowRegistrations"
                                color="from-green-500 to-emerald-500"
                            />
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Automation */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Database className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
                            Automation
                        </h3>
                        <div className="space-y-4">
                            <SettingToggle
                                label="Email Notifications"
                                description="Send email alerts for important events"
                                icon={Bell}
                                settingKey="emailNotifications"
                                color="from-blue-500 to-cyan-500"
                            />
                            <SettingToggle
                                label="Auto-Approve Students"
                                description="Automatically approve student registrations"
                                icon={UserPlus}
                                settingKey="autoApproveStudents"
                                color="from-purple-500 to-pink-500"
                            />
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
            >
                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0px 0px 20px rgba(0,240,255,0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                >
                    Save Changes
                </motion.button>
                <p className="text-sm text-slate-500 mt-3">
                    Note: Settings are UI-only in this demo. Connect to Firestore for persistence.
                </p>
            </motion.div>
        </div>
    );
};

export default Settings;
