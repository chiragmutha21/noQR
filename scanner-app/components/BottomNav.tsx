'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Scan, Layers, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Targets', icon: Layers, path: '/targets' }, // We can make this / or keep it targets
        { name: 'Scan', icon: Scan, path: '/scan', isMain: true },
        { name: 'Profile', icon: User, path: '/profile' },
    ];

    // Hide on AR/Scan pages
    const isFullScreen = pathname.startsWith('/scan') || pathname.startsWith('/ar');
    if (isFullScreen) return null;

    return (
        <div className="lg:hidden fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-sm">
            <nav className="bg-zinc-900/95 backdrop-blur-3xl border border-white/5 rounded-[20px] flex items-center justify-around px-1 py-1 sm:px-2 sm:py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    if (item.isMain) {
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="relative -top-10 flex flex-col items-center"
                            >
                                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(59,130,246,0.5)] border-[3px] sm:border-4 border-[#0a0a0a] group active:scale-90 transition-all">
                                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="mt-1 sm:mt-2 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-blue-500">Scan</span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center py-1 sm:py-2 px-1 sm:px-4 rounded-xl transition-all relative flex-1",
                                isActive ? "text-white" : "text-zinc-500"
                            )}
                        >
                            <div className={cn(
                                "p-1 sm:p-2 rounded-xl transition-all mb-0.5",
                                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-transparent"
                            )}>
                                <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                            </div>
                            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;
