'use client';
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  getContentList, deleteContent, ARContent, updateContent,
  attachContent, getAttachedContents, deleteAttachedContent, AttachedContent,
  getTargetDetails
} from "@/lib/api";
import {
  Copy, Trash2, Calendar, FileType, Search, ExternalLink, Info,
  Video, Music, Image as ImageIcon, Type, FileText, Plus, X, Paperclip, Loader2, Download, Edit2, UploadCloud, BarChart2, Timer, MousePointerClick, ArrowLeft, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ... existing code ...

const CONTENT_TYPES = [
  { id: 'video' as const, label: 'Video', icon: Video, color: 'text-red-400' },
  { id: 'audio' as const, label: 'Audio', icon: Music, color: 'text-purple-400' },
  { id: 'image' as const, label: 'Image', icon: ImageIcon, color: 'text-green-400' },
  { id: 'text' as const, label: 'Text', icon: Type, color: 'text-yellow-400' },
  { id: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-orange-400' },
];

const Dashboard = () => {
  const { data: session } = useSession();
  const [contents, setContents] = useState<ARContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContent, setSelectedContent] = useState<ARContent | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<ARContent | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Attachment state
  const [attachments, setAttachments] = useState<AttachedContent[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [attachType, setAttachType] = useState<'video' | 'audio' | 'image' | 'text' | 'pdf'>('video');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachText, setAttachText] = useState('');
  const [attachTitle, setAttachTitle] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachCounts, setAttachCounts] = useState<Record<string, number>>({});

  // Edit Message state
  const [editingContent, setEditingContent] = useState<ARContent | null>(null);
  const [editType, setEditType] = useState<'video' | 'audio' | 'image' | 'text' | 'pdf'>('video');
  const [editUrl, setEditUrl] = useState('');
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!session?.user?.email) {
      setContents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await getContentList(session.user.email);
      setContents(data);
      const counts: Record<string, number> = {};
      await Promise.all(data.map(async (item) => {
        try {
          const resp = await getAttachedContents(item.contentId);
          counts[item.contentId] = resp.data.length;
        } catch { counts[item.contentId] = 0; }
      }));
      setAttachCounts(counts);
    } catch {
      toast.error('Failed to load your content');
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadAttachments = useCallback(async (contentId: string) => {
    setAttachLoading(true);
    try {
      const { data } = await getAttachedContents(contentId);
      setAttachments(data);
    } catch { setAttachments([]); }
    setAttachLoading(false);
  }, []);

  useEffect(() => {
    if (selectedContent) {
      loadAttachments(selectedContent.contentId);
      setShowAttachForm(false);
    }
  }, [selectedContent, loadAttachments]);

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

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copied!");
  };

  const handleRefreshStats = async () => {
    if (!showAnalytics) return;
    setRefreshingStats(true);
    try {
      const { data } = await getTargetDetails(showAnalytics.contentId);
      setShowAnalytics(data);
      setContents(prev => prev.map(c => c.contentId === data.contentId ? data : c));
      toast.success("Stats updated");
    } catch (err) {
      toast.error("Failed to refresh");
    }
    setRefreshingStats(false);
  };

  // Fresh Analytics for Modal
  useEffect(() => {
    if (showAnalytics) {
      const fetchFreshStats = async () => {
        try {
          const { data } = await getTargetDetails(showAnalytics.contentId);
          setShowAnalytics(data);
          // Update the main list so thumbnails/counters stay in sync
          setContents(prev => prev.map(c => c.contentId === data.contentId ? data : c));
        } catch (err) {
          console.error("Failed to refresh stats:", err);
        }
      };
      fetchFreshStats();
    }
  }, [showAnalytics?.contentId, showAnalytics === null]); // Refresh on open

  const filteredContents = contents.filter(c =>
    c.contentId.toLowerCase().includes(search.toLowerCase()) ||
    c.originalImageName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto relative px-1 sm:px-6 pb-20 sm:pb-32 pt-2 sm:pt-10">
      {/* 1. Header is handled by Sidebar.tsx mobile top bar */}

      {/* Welcome Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 sm:mb-6 mt-1"
      >
        <h1 className="text-xl sm:text-4xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-500 mb-0.5 sm:mb-1 leading-none">
          Bring Reality <br /> <span className="text-blue-500">To Life.</span>
        </h1>
        <p className="text-zinc-400 text-[8px] sm:text-sm leading-tight sm:leading-relaxed max-w-[90%] font-medium">
          Create, manage, and experience next-generation Augmented Reality markers instantly.
        </p>
      </motion.div>

      {/* 2. Main CTA: New Target */}
      <Link
        href="/upload"
        className="group relative flex items-center justify-center gap-1 sm:gap-3 w-full h-8 sm:h-16 bg-blue-600 rounded-[8px] sm:rounded-[20px] shadow-lg sm:shadow-2xl shadow-blue-600/30 overflow-hidden active:scale-[0.98] transition-all mb-2 sm:mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 group-hover:opacity-90 transition-opacity" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Plus className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white relative z-10 animate-pulse" />
        <span className="text-white font-black uppercase tracking-widest text-[8px] sm:text-lg relative z-10">New Target</span>
      </Link>

      {/* 3. Search Field */}
      <div className="relative mb-2 sm:mb-8">
        <Search className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-2.5 h-2.5 sm:w-5 sm:h-5" />
        <input
          type="text"
          placeholder="Search targets..."
          className="w-full bg-zinc-900/50 border border-white/10 rounded-lg sm:rounded-2xl pl-6 sm:pl-12 pr-2 sm:pr-4 py-1.5 sm:py-4 text-[8px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 4. Target List */}
      <div className="space-y-2 sm:space-y-6">
        <div className="flex items-center justify-between px-1 mb-1">
          <h2 className="text-[7px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Your Targets ({filteredContents.length})</h2>
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 rounded-md border border-white/5 hover:bg-zinc-800 transition-all active:scale-95"
          >
            <RefreshCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[6px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-zinc-900/50 rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : filteredContents.length > 0 ? (
          filteredContents.map((item) => (
            <motion.div
              key={item.contentId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-sm"
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
                  onClick={() => handleDelete(item._id, item.contentId)}
                  className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-2 text-[7px] sm:text-[10px] font-bold text-red-400/80 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">DEL</span>
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          /* 7. Empty State */
          <div className="flex flex-col items-center justify-center py-4 sm:py-20 px-2 sm:px-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-[12px] sm:rounded-[32px]">
            <div className="w-6 h-6 sm:w-20 sm:h-20 bg-zinc-900 rounded-[8px] sm:rounded-[28px] flex items-center justify-center mb-2 sm:mb-6 border border-white/5 shadow-inner">
              <UploadCloud className="w-3.5 h-3.5 sm:w-10 sm:h-10 text-zinc-700" />
            </div>
            <h3 className="text-[10px] sm:text-xl font-bold text-white mb-0.5 sm:mb-1">No Targets Yet</h3>
            <p className="text-zinc-500 text-[6px] sm:text-sm leading-relaxed mb-2 sm:mb-8">
              Upload your first target image to attach AR content like videos, 3D models, or links.
            </p>
            <Link
              href="/upload"
              className="px-2 py-1 sm:px-8 sm:py-4 bg-white text-black font-black uppercase tracking-widest text-[6px] sm:text-xs rounded-md sm:rounded-xl shadow-lg sm:shadow-xl active:scale-95 transition-all text-center"
            >
              + Add Target
            </Link>
          </div>
        )}
      </div>



      {/* Modals keep their existing logic but get styling polish */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedContent(null)}
          >
            {/* Back Button in the black space */}
            <button
              onClick={() => setSelectedContent(null)}
              className="absolute top-10 left-6 p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10 z-[110] hover:bg-white/20 transition-all shadow-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-sm aspect-[3/4] rounded-[40px] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={`${BACKEND_URL}${selectedContent.imagePath}`}
                className="w-full h-full object-cover"
                alt="Preview"
              />
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
              className="bg-zinc-900 border-t border-x border-white/10 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md p-8 pb-12"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-blue-500" />
                  </div>
                  Update Content
                </h3>
                <button onClick={() => setEditingContent(null)} className="p-2 text-zinc-500"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Content Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {CONTENT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setEditType(t.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${editType === t.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-zinc-500 shadow-inner'}`}
                      >
                        <t.icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Title</label>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all shadow-inner" placeholder="Content title..." />
                </div>

                {editType === 'text' ? (
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all shadow-inner" placeholder="Your secret message..." />
                ) : (
                  <div className="space-y-4">
                    <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer group shadow-inner">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => { if (e.target.files) setEditFile(e.target.files[0]) }} />
                      <UploadCloud className="w-8 h-8 text-zinc-600 mx-auto mb-2 group-hover:text-blue-500" />
                      <p className="text-xs font-bold text-zinc-400">{editFile ? editFile.name : 'Replace attached file'}</p>
                    </div>
                    <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all shadow-inner" placeholder="Or enter URL" />
                  </div>
                )}

                <button
                  onClick={handleEditSubmit}
                  disabled={editSubmitting}
                  className="w-full bg-white text-black font-black py-5 rounded-[20px] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-50"
                >
                  {editSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Changes'}
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
              className="bg-zinc-900 border-t border-x border-white/10 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md p-8 pb-12"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-blue-500" />
                  </div>
                  Target Analytics
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefreshStats}
                    disabled={refreshingStats}
                    className={`p-2 text-blue-400 hover:bg-blue-500/10 rounded-full transition-all ${refreshingStats ? 'animate-spin' : ''}`}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowAnalytics(null)} className="p-2 text-zinc-500 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-zinc-800/50 border border-white/5 rounded-[24px] p-4 text-center">
                    <h4 className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-1">Scans</h4>
                    <p className="text-2xl font-black text-white">{showAnalytics.analytics?.totalScans || 0}</p>
                  </div>
                  <div className="bg-zinc-800/50 border border-white/5 rounded-[24px] p-4 text-center">
                    <h4 className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-1">Engagement</h4>
                    <p className="text-2xl font-black text-blue-400">
                      {showAnalytics.analytics?.engagementTime
                        ? (showAnalytics.analytics.engagementTime / (showAnalytics.analytics.totalScans || 1)).toFixed(1)
                        : "0.0"}s
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 border border-white/5 rounded-[24px] p-4 text-center">
                    <h4 className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-1">Clicks</h4>
                    <p className="text-2xl font-black text-green-400">{showAnalytics.analytics?.ctaClicks || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <Timer className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Total View Time</p>
                      <p className="text-sm font-bold text-white">{Math.floor((showAnalytics.analytics?.engagementTime || 0) / 60)}m {Math.floor((showAnalytics.analytics?.engagementTime || 0) % 60)}s</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <MousePointerClick className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Conversion Rate</p>
                      <p className="text-sm font-bold text-white">
                        {showAnalytics.analytics?.totalScans
                          ? (((showAnalytics.analytics.ctaClicks || 0) / showAnalytics.analytics.totalScans) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Scans by Country</h4>
                  <div className="bg-zinc-800/30 border border-white/5 rounded-[20px] p-2 max-h-[160px] overflow-y-auto no-scrollbar">
                    {(!showAnalytics.analytics?.countryScans || Object.keys(showAnalytics.analytics.countryScans).length === 0) ? (
                      <div className="py-8 text-center text-xs text-zinc-500 font-medium">No scans recorded yet.</div>
                    ) : (
                      Object.entries(showAnalytics.analytics.countryScans)
                        .sort(([, a], [, b]) => b - a)
                        .map(([country, count]) => (
                          <div key={country} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-colors">
                            <span className="text-sm font-bold text-zinc-300">{country}</span>
                            <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/10">{count}</span>
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
};

export default Dashboard;
