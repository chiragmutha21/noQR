'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadContent } from '@/lib/api';
import { useSession, signIn } from 'next-auth/react';
import {
    Upload, X, FileImage, FileVideo, CheckCircle2, Loader2,
    Link as LinkIcon, File, Music, Image as ImageIcon, Type, FileText, Scan, LogIn, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


const CONTENT_TYPES = [
    { id: 'video' as const, label: 'Video', icon: FileVideo, color: 'text-red-400' },
    { id: 'audio' as const, label: 'Audio', icon: Music, color: 'text-purple-400' },
    { id: 'image' as const, label: 'Image', icon: ImageIcon, color: 'text-green-400' },
    { id: 'text' as const, label: 'Text', icon: Type, color: 'text-yellow-400' },
    { id: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-orange-400' },
];

export default function UploadForm() {
    const { data: session, status } = useSession();
    const [image, setImage] = useState<File | null>(null);
    const [contentType, setContentType] = useState<'video' | 'audio' | 'image' | 'text' | 'pdf'>('video');
    const [contentFile, setContentFile] = useState<File | null>(null);
    const [contentUrl, setContentUrl] = useState('');
    const [contentText, setContentText] = useState('');
    const [mode, setMode] = useState<'file' | 'link'>('file');

    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [successId, setSuccessId] = useState<string | null>(null);

    const onDropImage = useCallback((acceptedFiles: File[]) => {
        setImage(acceptedFiles[0]);
        setSuccessId(null);
    }, []);

    const onDropFile = useCallback((acceptedFiles: File[]) => {
        setContentFile(acceptedFiles[0]);
        setSuccessId(null);
    }, []);

    const { getRootProps: getImageProps, getInputProps: getImageInput, isDragActive: isImageDrag } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
        maxFiles: 1
    });

    const { getRootProps: getFileProps, getInputProps: getFileInput, isDragActive: isFileDrag } = useDropzone({
        onDrop: onDropFile,
        accept: contentType === 'video' ? { 'video/*': ['.mp4'] } :
            contentType === 'audio' ? { 'audio/*': ['.mp3', '.wav'] } :
                contentType === 'image' ? { 'image/*': ['.jpg', '.png', '.jpeg'] } :
                    contentType === 'pdf' ? { 'application/pdf': ['.pdf'] } :
                        undefined,
        maxFiles: 1,
        disabled: contentType === 'text'
    });

    const handleSubmit = async () => {
        if (!image) {
            toast.error("Please select a target image");
            return;
        }

        if (contentType === 'text' && !contentText.trim()) {
            toast.error("Please enter text content");
            return;
        }

        if (contentType !== 'text') {
            if (mode === 'file' && !contentFile) {
                toast.error(`Please upload a ${contentType} file`);
                return;
            }
            if (mode === 'link' && !contentUrl.trim()) {
                toast.error(`Please enter a ${contentType} URL`);
                return;
            }
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('type', contentType);

        if (contentType === 'text') {
            formData.append('text', contentText);
        } else if (mode === 'file' && contentFile) {
            formData.append('file', contentFile);
        } else {
            formData.append('url', contentUrl);
        }

        if (session?.user?.email) {
            formData.append('user_email', session.user.email);
        }

        setUploading(true);
        setProgress(0);
        const loadingToast = toast.loading("Creating AR Content...");

        try {
            const res = await uploadContent(formData, (p: number) => {
                setProgress(p);
            });

            setSuccessId(res.data.contentId);
            toast.success("Content Created!", { id: loadingToast });

            // Auto-download target
            const url = URL.createObjectURL(image);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AR_Target_${image.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Reset
            setImage(null);
            setContentFile(null);
            setContentUrl('');
            setContentText('');
        } catch (error: any) {
            const errMsg = error.response?.data?.detail || "Upload failed";
            toast.error(`Error: ${errMsg}`, { id: loadingToast });
        } finally {
            setUploading(false);
        }
    };

    const isReady = image && (contentType === 'text' ? contentText.trim() : (mode === 'file' ? contentFile : contentUrl.trim()));

    if (status === 'unauthenticated') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto py-12 px-8 bg-zinc-900/50 border border-zinc-800 rounded-[40px] text-center space-y-6"
            >
                <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto">
                    <LogIn className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2">Login Required</h3>
                    <p className="text-zinc-500 text-sm">You need to authenticate with Google to create and manage AR content.</p>
                </div>
                <button
                    onClick={() => signIn('google')}
                    className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98]"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>
            </motion.div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8 pb-10 sm:pb-20">

            <div className="space-y-3 sm:space-y-6">
                {/* Image Upload */}
                <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[9px] sm:text-sm font-bold text-zinc-500 uppercase tracking-widest">1. Target Image (The trigger)</label>
                        <button
                            type="button"
                            onClick={() => {
                                const camInput = document.getElementById('camera-input');
                                if (camInput) camInput.click();
                            }}
                            className="flex lg:hidden items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-blue-600/10 text-blue-400 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-tighter hover:bg-blue-600/20 transition-all border border-blue-500/10"
                        >
                            <Scan className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                            Take Photo
                        </button>
                    </div>

                    {/* Hidden input for mobile camera specifically */}
                    <input
                        id="camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setImage(e.target.files[0]);
                                setSuccessId(null);
                            }
                        }}
                    />

                    <div
                        {...getImageProps()}
                        className={cn(
                            "h-32 sm:h-56 rounded-[20px] sm:rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden relative group",
                            isImageDrag ? "border-blue-500 bg-blue-500/5 transition-opacity duration-300" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50",
                            image ? "border-solid border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : ""
                        )}
                    >
                        <input {...getImageInput()} />
                        {image ? (
                            <div className="absolute inset-0 w-full h-full">
                                <img src={URL.createObjectURL(image)} className="w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center mb-1 sm:mb-2">
                                        <Plus className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <p className="text-white text-[7px] sm:text-[10px] font-black uppercase tracking-widest">Change Target</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center p-2 sm:p-8 text-center">
                                <div className="w-8 h-8 sm:w-14 sm:h-14 bg-zinc-800/50 rounded-lg sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 text-zinc-500 group-hover:text-blue-400 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                                    <FileImage className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-[10px] sm:text-sm font-bold text-zinc-200">Drop your physical photo here</p>
                                <p className="text-[7px] sm:text-[10px] text-zinc-600 uppercase tracking-[0.2em] mt-1 sm:mt-2 font-medium">PNG, JPG up to 10MB</p>
                                <div className="mt-2 sm:mt-4 flex flex-wrap justify-center gap-1 sm:gap-2">
                                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-zinc-800/50 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-bold text-zinc-500">BROWSE FILES</span>
                                    <span className="lg:hidden px-2 py-1 sm:px-3 sm:py-1 bg-blue-500/10 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-bold text-blue-500">OPEN CAMERA</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-3 sm:space-y-4">
                    <label className="text-[9px] sm:text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1">2. Content to Show</label>

                    {/* Content Type Tabs */}
                    <div className="flex gap-1.5 sm:gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-x-auto no-scrollbar">
                        {CONTENT_TYPES.map(ct => {
                            const Icon = ct.icon;
                            return (
                                <button
                                    key={ct.id}
                                    onClick={() => { setContentType(ct.id); setContentFile(null); setContentUrl(''); setContentText(''); }}
                                    className={cn(
                                        "flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-bold transition-all whitespace-nowrap",
                                        contentType === ct.id
                                            ? "bg-zinc-800 text-white shadow-lg"
                                            : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <Icon className={cn("w-3 h-3 sm:w-4 sm:h-4", contentType === ct.id ? ct.color : "")} />
                                    {ct.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-[20px] sm:rounded-[32px] p-3 sm:p-6 space-y-2 sm:space-y-4">
                        {/* file vs link vs text logic */}
                        {contentType === 'text' ? (
                            <div className="space-y-1 sm:space-y-1.5">
                                <span className="text-[8px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">Message Body</span>
                                <textarea
                                    placeholder="Write something that will appear when scanned..."
                                    value={contentText}
                                    onChange={(e) => setContentText(e.target.value)}
                                    rows={4}
                                    className="w-full bg-black/50 border border-zinc-800 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[80px] sm:min-h-[120px]"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-1 sm:mb-2">
                                    <span className="text-[8px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">Source</span>
                                    <div className="flex bg-black/40 p-0.5 sm:p-1 rounded-md sm:rounded-lg border border-zinc-800">
                                        <button onClick={() => setMode('file')} className={cn("px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[10px] font-bold rounded", mode === 'file' ? "bg-zinc-700" : "text-zinc-500")}>File</button>
                                        <button onClick={() => setMode('link')} className={cn("px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[10px] font-bold rounded", mode === 'link' ? "bg-zinc-700" : "text-zinc-500")}>URL</button>
                                    </div>
                                </div>

                                {mode === 'file' ? (
                                    <div
                                        {...getFileProps()}
                                        className={cn(
                                            "h-20 sm:h-32 rounded-xl sm:rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                                            isFileDrag ? "border-blue-500 bg-blue-500/5" : "border-zinc-800 bg-black/30",
                                            contentFile ? "border-green-500/50" : ""
                                        )}
                                    >
                                        <input {...getFileInput()} />
                                        {contentFile ? (
                                            <div className="flex items-center gap-1.5 sm:gap-3 px-2">
                                                <div className="w-5 h-5 sm:w-8 sm:h-8 bg-green-500/20 text-green-500 rounded-md sm:rounded-lg flex shrink-0 items-center justify-center">
                                                    <File className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                                                </div>
                                                <span className="text-[9px] sm:text-sm font-medium text-zinc-200 truncate max-w-[120px] sm:max-w-[200px]">{contentFile.name}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setContentFile(null); }} className="p-0.5 sm:p-1 hover:bg-zinc-800 rounded-full text-zinc-500 shrink-0"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-zinc-600 mx-auto mb-1 sm:mb-2" />
                                                <p className="text-[8px] sm:text-xs text-zinc-500 font-medium">Click or drag {contentType}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="url"
                                        placeholder={`https://.../${contentType}${contentType === 'video' ? '.mp4' : (contentType === 'audio' ? '.mp3' : '')}`}
                                        className="w-full bg-black/50 border border-zinc-800 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 text-[9px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-blue-400"
                                        value={contentUrl}
                                        onChange={(e) => setContentUrl(e.target.value)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={uploading || !isReady}
                className={cn(
                    "w-full py-3 sm:py-5 rounded-[16px] sm:rounded-[24px] font-bold text-[10px] sm:text-base flex items-center justify-center gap-1.5 sm:gap-3 transition-all active:scale-[0.98] shadow-2xl",
                    uploading || !isReady
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                )}
            >
                {uploading ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-6 sm:h-6 animate-spin" />
                        Generating Explorer Layer...
                    </>
                ) : (
                    <>
                        <Scan className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
                        ACTIVATE EXPLORER TARGET
                    </>
                )}
            </button>

            <AnimatePresence>
                {successId && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-zinc-900 border border-green-500/30 rounded-[32px] flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm">Target Activated!</h4>
                            <p className="text-zinc-500 text-xs truncate">Marker ID: <span className="font-mono text-zinc-300 ml-1">{successId}</span></p>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(successId);
                                toast.success("ID Copied");
                            }}
                            className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            COPY ID
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
