'use client';
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  getContentList, deleteContent, ARContent, updateContent,
  attachContent, getAttachedContents, deleteAttachedContent, AttachedContent
} from "@/lib/api";
import {
  Copy, Trash2, Calendar, FileType, Search, ExternalLink, Info, Scan,
  Video, Music, Image as ImageIcon, Type, FileText, Plus, X, Paperclip, Loader2, Download, Edit2, UploadCloud
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

export default function Dashboard() {
  const { data: session } = useSession();
  const [contents, setContents] = useState<ARContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContent, setSelectedContent] = useState<ARContent | null>(null);

  // Step 2: attachment state
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

  // Fetch data on mount / session change
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
        // Fetch attachment counts for each content
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
    };

    fetchData();
  }, [session]);

  // Load attachments when modal opens
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
      resetAttachForm();
    }
  }, [selectedContent, loadAttachments]);

  const resetAttachForm = () => {
    setAttachUrl(''); setAttachText(''); setAttachTitle(''); setAttachFile(null); setAttachType('video');
  };

  const handleDelete = async (id: string, contentId: string) => {
    if (!confirm("Are you sure? This will also delete all attached contents.")) return;
    try {
      await deleteContent(contentId);
      setContents(contents.filter(c => c.contentId !== contentId));
      if (selectedContent?.contentId === contentId) setSelectedContent(null);
      toast.success("Content deleted (including attachments)");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleAttach = async () => {
    if (!selectedContent) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('contentId', selectedContent.contentId);
      formData.append('contentType', attachType);
      formData.append('title', attachTitle);
      if (attachType === 'text') {
        formData.append('text', attachText);
      } else if (attachFile) {
        formData.append('file', attachFile);
      } else {
        formData.append('url', attachUrl);
      }
      await attachContent(formData);
      toast.success('Content attached!');
      await loadAttachments(selectedContent.contentId);
      setAttachCounts(prev => ({ ...prev, [selectedContent.contentId]: (prev[selectedContent.contentId] || 0) + 1 }));
      setShowAttachForm(false);
      resetAttachForm();
    } catch (err: unknown) {
      const msg = (err && typeof err === 'object' && 'response' in err)
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Attach failed'
        : 'Attach failed';
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedContent) return;
    try {
      await deleteAttachedContent(attachmentId);
      setAttachments(attachments.filter(a => a.attachmentId !== attachmentId));
      setAttachCounts(prev => ({ ...prev, [selectedContent.contentId]: Math.max(0, (prev[selectedContent.contentId] || 1) - 1) }));
      toast.success('Attachment deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleEditSubmit = async () => {
    if (!editingContent) return;
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', editType);
      formData.append('title', editTitle);
      if (editType === 'text') {
        formData.append('text', editText);
      } else if (editFile) {
        formData.append('file', editFile);
      } else {
        formData.append('url', editUrl);
      }

      await updateContent(editingContent.contentId, formData);
      toast.success('Hidden message updated successfully!');

      // Refresh list
      const { data } = await getContentList(session?.user?.email || undefined);
      setContents(data);
      setEditingContent(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update hidden message');
    }
    setEditSubmitting(false);
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copied to clipboard!");
  };

  const filteredContents = contents.filter(c =>
    c.contentId.toLowerCase().includes(search.toLowerCase()) ||
    c.originalImageName.toLowerCase().includes(search.toLowerCase())
  );

  const getShareUrl = (contentId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ar/${contentId}`;
    }
    return '';
  };

  return (
    <div className="max-w-7xl mx-auto relative px-4 sm:px-6 lg:px-8 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 py-8 border-b border-white/5">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                Vision Control
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-500 tracking-[0.3em] uppercase">System Active</span>
              </div>
            </div>
          </div>
          <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
            Manage your spatial triggers and hidden content. Your targets are synced across all devices globally.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Filter targets..."
              className="bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full transition-all backdrop-blur-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Link
            href="/scan"
            className="flex items-center justify-center gap-3 px-8 py-4 sm:py-3 bg-white text-black text-sm font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 uppercase tracking-widest"
          >
            <Scan className="w-4 h-4" />
            <span>Launch Scanner</span>
          </Link>
        </div>
      </header>


      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-zinc-900 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredContents.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.contentId}
                className="group relative bg-[#0a0a0a] border border-white/[0.03] rounded-[32px] overflow-hidden hover:border-blue-500/40 transition-all duration-500 flex flex-col hover:shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
              >
                {/* Image Container */}
                <div
                  className="relative h-60 sm:h-52 cursor-pointer overflow-hidden"
                  onClick={() => setSelectedContent(item)}
                >
                  <img
                    src={`${BACKEND_URL}${item.imagePath.split('/').map(p => encodeURIComponent(p)).join('/')}`}
                    alt={item.originalImageName}
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1 brightness-[0.9] group-hover:brightness-110"
                  />

                  {/* Glassy Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase border border-white/20 px-4 py-2 rounded-full bg-white/5">
                      Manage Target
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

                  {/* Actions - Always visible on mobile, hover on desktop */}
                  <div className="absolute top-4 right-4 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all duration-500 z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditType((item.type as any) || 'video');
                        setEditUrl(item.url || '');
                        setEditText(item.text || '');
                        setEditTitle(item.title || '');
                        setEditFile(null);
                        setEditingContent(item);
                      }}
                      className="p-3 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 hover:bg-green-600 text-white transition-all shadow-2xl"
                      title="Edit Hidden Message"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const imgUrl = `${BACKEND_URL}${item.imagePath}`;
                        const link = document.createElement('a');
                        link.href = imgUrl;
                        link.download = `target-${item.contentId}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success('Downloading target for printing...');
                      }}
                      className="p-3 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 hover:bg-blue-600 text-white transition-all shadow-2xl"
                      title="Download for Print"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/scan`}
                      className="p-3 bg-blue-600 rounded-2xl hover:bg-blue-500 text-white transition-all shadow-xl shadow-blue-500/20"
                      title="Start Scanner"
                    >
                      <Scan className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Attachment Count Badge */}
                  {(attachCounts[item.contentId] || 0) > 0 && (
                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-blue-500/10 backdrop-blur-md rounded-full border border-blue-500/20 text-[9px] font-black text-blue-400 flex items-center gap-1.5 shadow-lg uppercase tracking-tighter">
                      <Paperclip className="w-3 h-3" />
                      {attachCounts[item.contentId]} Content Ready
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-6 flex-1 flex flex-col bg-[#0a0a0a]">
                  <div className="mb-4">
                    <h3 className="font-black text-white mb-2 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">
                      {item.originalImageName}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
                      <span className="flex items-center gap-1.5 py-1 px-2 bg-zinc-900 rounded-lg">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'video' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        {item.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="flex-1 bg-zinc-900/40 rounded-xl p-3 border border-white/[0.02] flex items-center justify-between group/id overflow-hidden hover:border-white/10 transition-colors">
                      <span className="font-mono text-[9px] text-zinc-500 truncate mr-2 opacity-50">
                        {item.contentId}
                      </span>
                      <button
                        onClick={() => copyId(item.contentId)}
                        className="text-zinc-700 hover:text-white transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )
      }

      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 md:p-10"
            onClick={() => setSelectedContent(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-zinc-950/40 backdrop-blur-xl border border-white/10 md:rounded-[40px] overflow-hidden max-w-4xl w-full h-auto md:h-auto flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Centered Image Preview */}
              <div className="relative bg-black/20 flex items-center justify-center p-4 md:p-8 min-h-[50vh]">
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={`${BACKEND_URL}${selectedContent.imagePath}`}
                    alt={selectedContent.originalImageName}
                    className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/5"
                  />

                  {/* Close button for all screens */}
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="absolute -top-2 -right-2 md:top-0 md:right-0 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white shadow-xl border border-white/10 transition-colors z-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-white text-[10px] font-bold border border-white/10 flex items-center gap-2 shadow-lg tracking-[0.2em] uppercase">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{selectedContent.originalImageName}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white"><Edit2 className="w-5 h-5 text-blue-400" /> Edit Hidden Message</h3>
                <button onClick={() => setEditingContent(null)} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Content Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {CONTENT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setEditType(t.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${editType === t.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/5 hover:bg-white/5 text-zinc-400'} transition-all`}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Title (Optional)</label>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Content title..." />
                </div>

                {editType === 'text' ? (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Write Message</label>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Your secret message..." />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">File or Link</label>
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                        <input type="file" accept={editType === 'video' ? 'video/*' : editType === 'audio' ? 'audio/*' : editType === 'pdf' ? '.pdf' : 'image/*'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => { if (e.target.files) setEditFile(e.target.files[0]) }} />
                        <UploadCloud className="w-6 h-6 text-zinc-500 mx-auto mb-2 group-hover:text-blue-400" />
                        <p className="text-sm font-bold text-zinc-300">{editFile ? editFile.name : 'Click to Replace File'}</p>
                      </div>
                      <div className="flex items-center gap-2"><div className="h-px bg-white/10 flex-1" /><span className="text-xs font-bold text-zinc-500">OR</span><div className="h-px bg-white/10 flex-1" /></div>
                      <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Enter remote URL (e.g. YouTube Link)" />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleEditSubmit}
                  disabled={editSubmitting}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase text-sm tracking-wide"
                >
                  {editSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {
        !loading && filteredContents.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[40px]">
            <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Info className="w-8 h-8 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold mb-1">No content found</h2>
            <p className="text-zinc-500 max-w-sm mx-auto">Either start by uploading your first target image or try a different search term.</p>
          </div>
        )
      }
    </div >
  );
}
