import UploadForm from "@/components/UploadForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
    return (
        <div className="max-w-4xl mx-auto px-1 sm:px-4 pt-10 sm:pt-4">
            <header className="mb-4 sm:mb-12">
                <Link href="/" className="inline-flex items-center gap-1 sm:gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] sm:text-sm font-medium mb-2 sm:mb-6 group mt-2 sm:mt-0">
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>
                <h1 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-3 italic tracking-tight uppercase">New Target</h1>
                <p className="text-zinc-500 text-[9px] sm:text-lg leading-tight sm:leading-normal border-b border-zinc-900/50 pb-2 mb-2">Define the image trigger and the video overlay for your AR experience.</p>
            </header>

            <UploadForm />

            <section className="mt-8 sm:mt-20 border-t border-zinc-900 pt-4 sm:pt-10">
                <h3 className="text-[9px] sm:text-sm font-bold text-zinc-700 uppercase tracking-widest mb-3 sm:mb-6">Best Practices for AR Targets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8">
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">High Contrast</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Avoid blurry or low-contrast images. Patterns and sharp edges work best for ORB detection.</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">Asymmetric Design</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Avoid symmetrical patterns (like perfect circles) to help the system determine orientation.</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">Non-Reflective</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Use matte surfaces for physical targets to minimize glare from the camera lens.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
