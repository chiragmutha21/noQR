'use client';
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
    getContentList, deleteContent, ARContent, updateContent,
    getAttachedContents, AttachedContent
} from "@/lib/api";
import {
    Copy, Trash2, Calendar, FileType, Search, ExternalLink, Info, Scan,
    Video, Music, Image as ImageIcon, Type, FileText, Plus, X, UploadCloud, Download, Edit2, Loader2, BarChart2
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CONTENT_TYPES = [
    { id: 'video' as const, label: 'Video', icon: Video, color: 'text-red-400' },
    { id: 'audio' as const, label: 'Audio', icon: Music, color: 'text-purple-400' },
    { id: 'image' as const, label: 'Image', icon: ImageIcon, color: 'text-green-400' },
    { id: 'text' as const, label: 'Text', icon: Type, color: 'text-yellow-400' },
    { id: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-orange-400' },
];

export default function TargetsPage() {
    const { data: session } = useSession();
    const [contents, setContents] = useState<ARContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedContent, setSelectedContent] = useState<ARContent | null>(null);
    const [showAnalytics, setShowAnalytics] = useState<ARContent | null>(null);

    // Edit Message state
    const [editingContent, setEditingContent] = useState<ARContent | null>(null);
    const [editType, setEditType] = useState<'video' | 'audio' | 'image' | 'text' | 'pdf'>('video');
    const [editUrl, setEditUrl] = useState('');
    const [editText, setEditText] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!session?.user?.email) {
                setContents([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data } = await getContentList(session.user.email);
                setContents(data);
            } catch {
                toast.error('Failed to load your content');
            }
            setLoading(false);
        };

        fetchData();
    }, [session]);

    const handleDelete = async (id: string, contentId: string) => {
        if (!confirm("Are you sure? This will also delete all attached contents.")) return;
        try {
            await deleteContent(contentId);
            setContents(contents.filter(c => c.contentId !== contentId));
            if (selectedContent?.contentId === contentId) setSelectedContent(null);
            toast.success("Content deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    const handleEditSubmit = async () => {
        if (!editingContent) return;
        setEditSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', editType);
            formData.append('title', editTitle);
            if (editType === 'text') formData.append('text', editText);
            else if (editFile) formData.append('file', editFile);
            else formData.append('url', editUrl);

            await updateContent(editingContent.contentId, formData);
            toast.success('Updated successfully!');
            const { data } = await getContentList(session?.user?.email || undefined);
            setContents(data);
            setEditingContent(null);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to update');
        }
        setEditSubmitting(false);
    };

    const filteredContents = contents.filter(c =>
        c.contentId.toLowerCase().includes(search.toLowerCase()) ||
        c.originalImageName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-md mx-auto relative px-1 sm:px-6 pb-20 sm:pb-32 pt-12 sm:pt-14">
            {/* Search Field */}
            <div className="relative mb-4 sm:mb-8">
                <Search className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-2.5 h-2.5 sm:w-5 sm:h-5" />
                <input
                    type="text"
                    placeholder="Search targets..."
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg sm:rounded-2xl pl-6 sm:pl-12 pr-2 sm:pr-4 py-2 sm:py-4 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md text-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Target List */}
            <div className="space-y-2 sm:space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Your Targets ({filteredContents.length})</h2>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-zinc-900/50 rounded-[20px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredContents.length > 0 ? (
                    filteredContents.map((item) => (
                        <motion.div
                            key={item.contentId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 border border-white/5 rounded-[20px] overflow-hidden backdrop-blur-sm"
                        >
                            <div className="flex p-2 sm:p-3 gap-2 sm:gap-4">
                                {/* Thumbnail */}
                                <div
                                    className="relative w-12 h-12 sm:w-24 sm:h-24 rounded-lg sm:rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer"
                                    onClick={() => setSelectedContent(item)}
                                >
                                    <img
                                        src={`${BACKEND_URL}${item.imagePath}`}
                                        alt={item.originalImageName}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <h3 className="font-bold text-white truncate text-[10px] sm:text-base mb-0.5 sm:mb-1">{item.originalImageName}</h3>
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                        <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider px-1 sm:px-2 py-[1px] sm:py-0.5 bg-blue-500/10 text-blue-400 rounded-sm sm:rounded-md border border-blue-500/10 scale-90 sm:scale-100 origin-left">
                                            {item.type}
                                        </span>
                                        <span className="text-[7px] sm:text-[10px] text-zinc-500 flex items-center gap-0.5 sm:gap-1">
                                            <Calendar className="w-2 h-2 sm:w-3 sm:h-3" />
                                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions below the card */}
                            <div className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-2 bg-black/20 border-t border-white/5">
                                <button
                                    onClick={() => setShowAnalytics(item)}
                                    className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-2 text-[7px] sm:text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <BarChart2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">STATS</span>
                                </button>
                                <div className="w-[1px] h-3 sm:h-4 bg-white/5" />
                                <button
                                    onClick={() => {
                                        setEditType((item.type as any) || 'video');
                                        setEditUrl(item.url || '');
                                        setEditText(item.text || '');
                                        setEditTitle(item.title || '');
                                        setEditFile(null);
                                        setEditingContent(item);
                                    }}
                                    className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-2 text-[7px] sm:text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">EDIT</span>
                                </button>
                                <div className="w-[1px] h-3 sm:h-4 bg-white/5" />
                                <button
                                    onClick={() => {
                                        const imgUrl = `${BACKEND_URL}${item.imagePath}`;
                                        const link = document.createElement('a');
                                        link.href = imgUrl;
                                        link.download = `target-${item.contentId}.jpg`;
                                        link.click();
                                    }}
                                    className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-2 text-[7px] sm:text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                                >
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">SAVE</span>
                                </button>
                                <div className="w-[1px] h-3 sm:h-4 bg-white/5" />
                                <button
                                    onClick={() => handleDelete(item._id, item.contentId)}
                                    className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-2 text-[7px] sm:text-[10px] font-bold text-red-400/80 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">DEL</span>
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-4 sm:py-20 px-2 sm:px-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-[12px] sm:rounded-[32px]">
                        <div className="w-8 h-8 sm:w-20 sm:h-20 bg-zinc-900 rounded-[12px] flex items-center justify-center mb-2 sm:mb-6 border border-white/5 shadow-inner">
                            <UploadCloud className="w-4 h-4 text-zinc-700" />
                        </div>
                        <h3 className="text-[12px] sm:text-xl font-bold text-white mb-0.5 sm:mb-1">No Targets Yet</h3>
                        <p className="text-zinc-500 text-[8px] sm:text-sm leading-relaxed mb-4 sm:mb-8">
                            Upload your first target image to attach AR content like videos, 3D models, or links.
                        </p>
                        <Link
                            href="/upload"
                            className="px-4 py-2 sm:px-8 sm:py-4 bg-white text-black font-black uppercase tracking-widest text-[8px] sm:text-xs rounded-lg shadow-lg active:scale-95 transition-all text-center"
                        >
                            + Add Target
                        </Link>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedContent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
                        onClick={() => setSelectedContent(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative w-full max-w-sm aspect-[3/4] rounded-[40px] overflow-hidden border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={`${BACKEND_URL}${selectedContent.imagePath}`}
                                className="w-full h-full object-cover"
                                alt="Preview"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                            <button
                                onClick={() => setSelectedContent(null)}
                                className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingContent && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            className="bg-zinc-900 border-t border-x border-white/10 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 sm:pb-12"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm sm:text-xl font-bold flex items-center gap-2 text-white">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                    Update Content
                                </h3>
                                <button onClick={() => setEditingContent(null)} className="p-2 text-zinc-500"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <label className="block text-[8px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Content Type</label>
                                    <div className="grid grid-cols-5 gap-1.5 border border-zinc-900 rounded-lg p-1 bg-zinc-900/50">
                                        {CONTENT_TYPES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setEditType(t.id)}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all ${editType === t.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <t.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[8px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Title</label>
                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all" placeholder="Content title..." />
                                </div>

                                {editType === 'text' ? (
                                    <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] h-24 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all" placeholder="Your secret message..." />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative border-2 border-dashed border-zinc-800 rounded-lg p-4 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => { if (e.target.files) setEditFile(e.target.files[0]) }} />
                                            <UploadCloud className="w-5 h-5 text-zinc-600 mx-auto mb-1 group-hover:text-blue-500" />
                                            <p className="text-[9px] font-bold text-zinc-400">{editFile ? editFile.name : 'Replace attached file'}</p>
                                        </div>
                                        <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all font-mono" placeholder="Or enter URL" />
                                    </div>
                                )}

                                <button
                                    onClick={handleEditSubmit}
                                    disabled={editSubmitting}
                                    className="w-full bg-blue-600 text-white font-black py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px] tracking-widest uppercase disabled:opacity-50 mt-2"
                                >
                                    {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAnalytics && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            className="bg-zinc-900 border-t border-x border-white/10 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 sm:pb-12"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm sm:text-xl font-bold flex items-center gap-2 text-white">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                                        <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                    Target Analytics
                                </h3>
                                <button onClick={() => setShowAnalytics(null)} className="p-2 text-zinc-500"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-zinc-800/50 border border-white/5 rounded-lg sm:rounded-[24px] p-4 sm:p-6 text-center">
                                    <h4 className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Total Scans</h4>
                                    <p className="text-3xl sm:text-5xl font-black text-white">{showAnalytics.analytics?.totalScans || 0}</p>
                                </div>

                                <div className="space-y-2 sm:space-y-3">
                                    <h4 className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Scans by Country</h4>
                                    <div className="bg-zinc-800/30 border border-white/5 rounded-lg sm:rounded-[20px] p-2 max-h-[120px] sm:max-h-[160px] overflow-y-auto no-scrollbar">
                                        {(!showAnalytics.analytics?.countryScans || Object.keys(showAnalytics.analytics.countryScans).length === 0) ? (
                                            <div className="py-4 sm:py-8 text-center text-[10px] sm:text-xs text-zinc-500 font-medium">No scans recorded yet.</div>
                                        ) : (
                                            Object.entries(showAnalytics.analytics.countryScans)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([country, count]) => (
                                                    <div key={country} className="flex justify-between items-center p-2 sm:p-3 hover:bg-white/5 rounded-md sm:rounded-xl transition-colors">
                                                        <span className="text-[10px] sm:text-sm font-bold text-zinc-300">{country}</span>
                                                        <span className="text-[10px] sm:text-sm font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg border border-blue-500/10">{count}</span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
