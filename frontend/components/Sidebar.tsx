'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard, Upload, Scan,
    LogOut, Menu, X as CloseIcon, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Sidebar = () => {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Scan Live', icon: Scan, path: '/scan' },
        { name: 'New Target', icon: Upload, path: '/upload' },
    ];

    // Non-dashboard pages show a back button on mobile instead of the full sidebar toggle in some layouts, 
    // but here we keep the top bar for consistent branding if on the main routes.
    const isDashboard = pathname === '/';

    return (
        <>
            {/* Mobile Top Bar */}
            <div className={cn(
                "lg:hidden fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-[60] transition-all duration-300",
                isDashboard ? "bg-black/80 backdrop-blur-xl border-b border-white/5 opacity-100" : "bg-transparent border-none pointer-events-none opacity-0"
            )}>
                {isDashboard && (
                    <>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Scan className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-black text-sm tracking-widest uppercase italic text-white flex items-center gap-2">
                                Vision <span className="text-blue-500">Control</span>
                            </span>
                        </div>
                        <button
                            onClick={toggleSidebar}
                            className="p-3 bg-zinc-900 rounded-xl text-zinc-400 pointer-events-auto active:scale-95 transition-transform"
                        >
                            {isOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </>
                )}
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed left-0 top-0 h-screen w-72 bg-[#050505] border-r border-white/5 z-[80] transition-transform duration-500 ease-out lg:translate-x-0 flex flex-col",
                isOpen ? "translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]" : "-translate-x-full"
            )}>
                {/* Logo Section */}
                <div className="p-8">
                    <div className="flex items-center gap-4 py-4 px-2">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40">
                            <Scan className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block font-black text-xl tracking-tighter uppercase italic text-white leading-none">Vision</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Core Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-2 py-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110 z-10",
                                    isActive ? "text-white" : "text-zinc-600 group-hover:text-blue-400"
                                )} />
                                <span className="font-bold text-sm tracking-tight z-10">{item.name}</span>

                                {isActive && (
                                    <motion.div
                                        layoutId="active-highlight"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 z-0"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-6 border-t border-white/5 bg-zinc-950/50">
                    {session?.user && (
                        <div className="bg-zinc-900/40 rounded-[28px] p-4 flex items-center gap-4 border border-white/5 group/profile">
                            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
                                {session.user.image ? (
                                    <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    session.user.name?.[0].toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate leading-tight">{session.user.name}</p>
                                <p className="text-[10px] text-zinc-500 truncate lowercase mt-0.5">{session.user.email}</p>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="p-2.5 rounded-xl bg-zinc-800 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
