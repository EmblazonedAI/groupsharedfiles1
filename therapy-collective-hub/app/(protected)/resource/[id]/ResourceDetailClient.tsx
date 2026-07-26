'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Heart, MessageCircle, Download, FileText, Video, Headphones, BookOpen, Link as LinkIcon, Image as ImageIcon, File, User, Send, Trash2, Minus, Edit3, X, Check, AlertTriangle, Paperclip, Maximize2, Globe, Upload, Loader2 } from 'lucide-react';

function CircularProgress({ progress }: { progress: number }) {
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E6E1" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#8F9F8A" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-[#4A4A4A]">{Math.round(progress)}%</span>
    </div>
  );
}
import { CATEGORIES, FORMATS } from '@/lib/config';
import { isImageUrl, getBlobProxyUrl, getFileName, getDomain } from '@/lib/files';
import FilePreview from '@/components/FilePreview';
import AvatarPicker, { isEmojiAvatar } from '@/components/AvatarPicker';

const getFormatIcon = (format: string) => {
  switch (format) {
    case 'Article': return FileText;
    case 'Video': return Video;
    case 'Audio/Meditation': return Headphones;
    case 'Book Recommendation': return BookOpen;
    case 'Website/Tool': return LinkIcon;
    case 'Image/Infographic': return ImageIcon;
    case 'Worksheet': return File;
    default: return File;
  }
};

const isVideoUrl = (url: string) => {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
};

const getYouTubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

const getPreviewImageUrl = (resource: any) => {
  if (resource.ogImage) return resource.ogImage;
  if (resource.url) return `https://image.thum.io/get/width/1200/${resource.url}`;
  return null;
};

export default function ResourceDetailClient({ initialResource }: { initialResource: any }) {
  const router = useRouter();
  const [resource, setResource] = useState(initialResource);
  const [commentText, setCommentText] = useState('');
  const [commentName, setCommentName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showHeartBloom, setShowHeartBloom] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File edit states
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [editData, setEditData] = useState({
    title: '',
    url: '',
    description: '',
    tags: '',
    category: '',
    format: '',
    addedBy: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setAllCategories).catch(() => { });
  }, []);

  const Icon = getFormatIcon(resource.format);

  const startEditing = () => {
    setEditData({
      title: resource.title || '',
      url: resource.url || '',
      description: resource.description || '',
      tags: resource.tags?.join(', ') || '',
      category: resource.category || '',
      format: resource.format || '',
      addedBy: resource.addedBy || '',
      notes: resource.notes || '',
    });
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setRemoveExistingFile(false);
    setIsEditing(true);
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    const ext = fileToUpload.name.lastIndexOf('.') >= 0 ? fileToUpload.name.slice(fileToUpload.name.lastIndexOf('.')) : '';
    const baseName = fileToUpload.name.lastIndexOf('.') >= 0 ? fileToUpload.name.slice(0, fileToUpload.name.lastIndexOf('.')) : fileToUpload.name;
    const uniqueName = `${baseName}-${Date.now()}${ext}`;

    const { upload } = await import('@vercel/blob/client');
    const blob = await upload(uniqueName, fileToUpload, {
      access: 'private',
      handleUploadUrl: '/api/upload',
      onUploadProgress: (e) => {
        setUploadProgress(Math.round(e.percentage));
      },
    });
    return blob.url;
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      let finalBlobUrl = resource.blobUrl;
      if (removeExistingFile) {
        finalBlobUrl = null;
      }
      if (file) {
        setIsUploading(true);
        setUploadProgress(0);
        try {
          finalBlobUrl = await uploadFile(file);
        } catch (err: any) {
          alert(`File upload failed: ${err.message}`);
          setIsUploading(false);
          setUploadProgress(0);
          setIsSaving(false);
          return;
        }
        setIsUploading(false);
      }

      const res = await fetch(`/api/resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          blobUrl: finalBlobUrl,
          tags: editData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setResource((prev: any) => ({ ...prev, ...updated }));
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this resource and all its comments? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/resources/${resource.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/library');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReaction = async (type: 'like' | 'love', action: 'add' | 'subtract' = 'add') => {
    try {
      if (action === 'add') setShowHeartBloom(true);

      const res = await fetch(`/api/resources/${resource.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action }),
      });

      if (res.ok) {
        const data = await res.json();
        setResource((prev: any) => ({
          ...prev,
          likeCount: data.likeCount,
          loveCount: data.loveCount,
        }));
      }

      if (action === 'add') {
        setTimeout(() => setShowHeartBloom(false), 1000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setResource((prev: any) => ({
          ...prev,
          comments: prev.comments.filter((c: any) => c.id !== commentId),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          name: commentName || 'Anonymous',
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setResource((prev: any) => ({
          ...prev,
          comments: [newComment, ...prev.comments],
        }));
        setCommentText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 md:p-10 border border-[#E8E6E1] shadow-sm relative overflow-hidden"
      >
        <AnimatePresence>
          {showHeartBloom && (
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 20, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-pink-100 rounded-full pointer-events-none z-0"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10">
          {/* Removed top action buttons */}

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B6B6B] mb-1">URL</label>
                <input
                  type="url"
                  value={editData.url}
                  onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
                />
              </div>

              {/* Edit Attached File */}
              <div className="border border-[#E8E6E1] rounded-xl p-4 bg-[#F9F8F6]">
                <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Attached File</label>
                {!removeExistingFile && !file && resource.blobUrl ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8E6E1]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{getFileName(resource.blobUrl)}</span>
                    </div>
                    <button
                      onClick={() => setRemoveExistingFile(true)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    {file ? (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#8F9F8A]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <File className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />
                          <span className="text-sm font-medium truncate text-[#4A4A4A]">New: {file.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setFile(null);
                            if (resource.blobUrl) setRemoveExistingFile(false);
                          }}
                          className="text-[#6B6B6B] hover:bg-[#F0EFEA] p-1.5 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setFile(e.target.files[0]);
                              setRemoveExistingFile(true); // Effectively replacing the old one
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#D1CFC9] rounded-xl hover:border-[#8F9F8A] bg-white transition-colors">
                          <Upload className="w-8 h-8 text-[#8F9F8A] mb-2" />
                          <span className="text-sm font-medium text-[#4A4A4A]">Upload a new file to replace the current one</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isUploading && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <CircularProgress progress={uploadProgress} />
                    <span className="text-xs text-[#6B6B6B]">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Category</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
                  >
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Format</label>
                  <select
                    value={editData.format}
                    onChange={(e) => setEditData({ ...editData, format: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
                  >
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <AvatarPicker
                    label="Shared by"
                    value={editData.addedBy}
                    onChange={(addedBy) => setEditData({ ...editData, addedBy })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B6B6B] mb-1">Private Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#F0EFEA] hover:bg-[#E8E6E1] text-[#6B6B6B] rounded-xl font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center space-x-2 bg-[#F0EFEA] px-3 py-1.5 rounded-xl text-[#8F9F8A]">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{resource.format}</span>
                </div>
                <div className="bg-[#F9F8F6] px-3 py-1.5 rounded-xl text-xs font-medium text-[#6B6B6B]">
                  {resource.category}
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif text-[#4A4A4A] mb-4 leading-tight">
                {resource.title}
              </h1>

              {resource.description && (
                <p className="text-lg text-[#6B6B6B] mb-6 leading-relaxed">
                  {resource.description}
                </p>
              )}

              {/* Visible URL - Rich Link Preview (Facebook/WhatsApp style) */}
              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 block rounded-2xl border border-[#E8E6E1] overflow-hidden hover:border-[#8F9F8A] hover:shadow-md transition-all group/link"
                >
                  {/* Website Preview Image */}
                  {getPreviewImageUrl(resource) && (
                    <div className="w-full h-64 bg-[#F0EFEA] overflow-hidden">
                      <img
                        src={getPreviewImageUrl(resource)}
                        alt=""
                        className="w-full h-full object-cover object-top group-hover/link:scale-[1.02] transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#F9F8F6]">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${getDomain(resource.url)}&sz=32`}
                      alt=""
                      className="w-4 h-4 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider truncate">{getDomain(resource.url)}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8C8C8C] group-hover/link:text-[#8F9F8A] flex-shrink-0 ml-auto transition-colors" />
                  </div>
                </a>
              )}

              {/* YouTube Embed */}
              {resource.url && getYouTubeEmbedUrl(resource.url) && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-[#E8E6E1] aspect-video">
                  <iframe
                    src={getYouTubeEmbedUrl(resource.url)!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Attached File Preview (PDF viewer, image, audio/video player, or attachment card) */}
              {resource.blobUrl && <FilePreview blobUrl={resource.blobUrl} title={resource.title} />}

              <div className="flex flex-wrap gap-2 mb-8">
                {resource.tags?.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-[#F9F8F6] rounded-lg text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t border-[#E8E6E1]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-xl overflow-hidden border border-[#E8E6E1]">
                    <button
                      onClick={() => handleReaction('like', 'subtract')}
                      className="px-2 py-2 bg-[#F9F8F6] hover:bg-[#E8E6E1] text-[#8C8C8C] transition-colors"
                      title="Remove like"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReaction('like')}
                      className="flex items-center gap-2 px-3 py-2 bg-[#F9F8F6] hover:bg-[#F0EFEA] text-[#6B6B6B] transition-colors"
                      title="Like this resource"
                    >
                      <Heart className="w-5 h-5" />
                      {/* Combined with legacy "love" reactions so old counts aren't lost */}
                      <span className="font-medium">{resource.likeCount + resource.loveCount}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!isEditing && (
                    <>
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:text-[#4A4A4A] border border-[#E8E6E1] bg-white hover:bg-[#F9F8F6] rounded-xl transition-colors"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:text-red-500 border border-[#E8E6E1] bg-white hover:bg-red-50 hover:border-red-100 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </>
                  )}
                  {resource.blobUrl && (
                    <a
                      href={isImageUrl(resource.blobUrl)
                        ? getBlobProxyUrl(resource.blobUrl)
                        : getBlobProxyUrl(resource.blobUrl, { download: true, name: getFileName(resource.blobUrl, resource.title) })}
                      target={isImageUrl(resource.blobUrl) ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-xl font-medium transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      {isImageUrl(resource.blobUrl) ? 'View Full Size' : 'Download File'}
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Meta & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Notes Section */}
          {resource.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#F0EFEA]/50 rounded-3xl p-8 border border-[#E8E6E1]"
            >
              <h3 className="text-lg font-serif text-[#4A4A4A] mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8F9F8A]" />
                Private Notes
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed whitespace-pre-wrap">
                {resource.notes}
              </p>
            </motion.div>
          )}

          {/* Comments Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-8 border border-[#E8E6E1] shadow-sm"
          >
            <h3 className="text-xl font-serif text-[#4A4A4A] mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#8F9F8A]" />
              Discussion ({resource.comments?.length || 0})
            </h3>

            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="bg-[#F9F8F6] rounded-2xl p-4 border border-[#E8E6E1]">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this resource..."
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-[#4A4A4A] placeholder:text-[#8C8C8C] p-0"
                  rows={3}
                  required
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-4 pt-4 border-t border-[#E8E6E1]">
                  <AvatarPicker
                    label="Comment as"
                    value={commentName}
                    onChange={setCommentName}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    <Send className="w-4 h-4" />
                    Post Comment
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-6">
              <AnimatePresence>
                {resource.comments?.map((comment: any) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 group/comment"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F0EFEA] flex items-center justify-center flex-shrink-0">
                      {isEmojiAvatar(comment.name)
                        ? <span className="text-xl leading-none">{comment.name}</span>
                        : <User className="w-5 h-5 text-[#8C8C8C]" />}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#4A4A4A]">
                          {isEmojiAvatar(comment.name) ? 'Anonymous' : (comment.name || 'Anonymous')}
                        </span>
                        <span className="text-xs text-[#8C8C8C]">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto opacity-0 group-hover/comment:opacity-100 p-1 text-[#8C8C8C] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[#6B6B6B] text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {resource.comments?.length === 0 && (
                <p className="text-center text-[#8C8C8C] py-4 text-sm">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
            <h4 className="text-sm font-semibold text-[#8C8C8C] uppercase tracking-wider mb-4">
              Resource Details
            </h4>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[#8C8C8C] mb-1">Shared By</dt>
                <dd className="font-medium text-[#4A4A4A]">
                  {isEmojiAvatar(resource.addedBy) ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#F0EFEA] flex items-center justify-center text-lg">{resource.addedBy}</span>
                      Anonymous
                    </span>
                  ) : (resource.addedBy || 'Anonymous')}
                </dd>
              </div>
              <div>
                <dt className="text-[#8C8C8C] mb-1">Added On</dt>
                <dd className="font-medium text-[#4A4A4A]">
                  {new Date(resource.addedAt).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <span className="block text-xs font-normal text-[#8C8C8C] mt-0.5">
                    {formatDistanceToNow(new Date(resource.addedAt))} ago
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[#8C8C8C] mb-1">Format</dt>
                <dd className="font-medium text-[#4A4A4A]">{resource.format}</dd>
              </div>
              <div>
                <dt className="text-[#8C8C8C] mb-1">Category</dt>
                <dd className="font-medium text-[#4A4A4A]">{resource.category}</dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
