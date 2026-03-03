'use client';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname === '/';
    const isFullScreen = pathname.startsWith('/scan') || pathname.startsWith('/ar');

    return (
        <div className="flex bg-black min-h-screen">
            <Sidebar />
            <main className={cn(
                "flex-1 lg:ml-72 min-h-screen transition-all",
                isDashboard ? "p-4 md:p-8 pt-20 lg:pt-8" :
                    isFullScreen ? "p-0" :
                        "p-4 md:p-8 pt-4 lg:pt-8"
            )}>
                {children}
            </main>
        </div>
    );
}
