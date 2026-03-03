import UploadForm from "@/components/UploadForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-12">
                <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium mb-6 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>
                <h1 className="text-4xl font-black mb-3 italic tracking-tight uppercase">New Target</h1>
                <p className="text-zinc-500 text-lg">Define the image trigger and the video overlay for your AR experience.</p>
            </header>

            <UploadForm />

            <section className="mt-20 border-t border-zinc-900 pt-10">
                <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-widest mb-6">Best Practices for AR Targets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <h4 className="font-bold text-zinc-300">High Contrast</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">Avoid blurry or low-contrast images. Patterns and sharp edges work best for ORB detection.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-zinc-300">Asymmetric Design</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">Avoid symmetrical patterns (like perfect circles) to help the system determine orientation.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-zinc-300">Non-Reflective</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">Use matte surfaces for physical targets to minimize glare from the camera lens.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
