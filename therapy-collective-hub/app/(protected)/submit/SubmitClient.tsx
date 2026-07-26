'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CATEGORIES, FORMATS } from '@/lib/config';
import { Leaf, Link as LinkIcon, Upload, Loader2 } from 'lucide-react';
import AvatarPicker from '@/components/AvatarPicker';

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

export default function SubmitClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingOg, setFetchingOg] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [ogImage, setOgImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    tags: '',
    category: '',
    format: FORMATS[0],
    addedBy: '',
  });

  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(cats => {
      setAllCategories(cats);
      // Initialize category once fetched so we don't submit empty category
      setFormData(prev => ({ ...prev, category: prev.category || cats[0] || '' }));
    }).catch(() => { });
  }, []);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, url }));

    if (url && url.startsWith('http')) {
      setFetchingOg(true);
      try {
        const res = await fetch('/api/og', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            title: prev.title || data.title || '',
            description: prev.description || data.description || '',
          }));
          if (data.image) setOgImage(data.image);
        }
      } catch (err) {
        console.error('Failed to fetch OG data', err);
      } finally {
        setFetchingOg(false);
      }
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    // Add unique suffix to prevent name conflicts
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let blobUrl = null;
      if (file) {
        setIsUploading(true);
        setUploadProgress(0);
        try {
          blobUrl = await uploadFile(file);
        } catch (err: any) {
          alert(`File upload failed: ${err.message}`);
          setIsUploading(false);
          setUploadProgress(0);
          setLoading(false);
          return;
        }
        setIsUploading(false);
      }

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          blobUrl,
          ogImage,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/resource/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to submit resource');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-serif text-[#4A4A4A]">Share a Resource</h1>
        <p className="text-[#8C8C8C] mt-2">Add a new tool, article, or worksheet to the collective library.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-[#E8E6E1] p-6 md:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL & File Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Link (URL)
                {fetchingOg && <Loader2 className="w-3 h-3 animate-spin text-[#8F9F8A]" />}
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={handleUrlChange}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" /> File Upload
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#F0EFEA] file:text-[#8F9F8A] hover:file:bg-[#E8E6E1]"
              />
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[#8F9F8A] bg-[#F0EFEA] px-3 py-1.5 rounded-lg">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="ml-auto text-[#8C8C8C] hover:text-red-500">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Title *</label>
            <input
              type="text"
              required
              maxLength={255}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all resize-none"
            />
          </div>

          {/* Category & Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
              >
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Format *</label>
              <select
                required
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
              >
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#6B6B6B] mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g. mindfulness, breathing, teens"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
            />
          </div>

          {/* Anonymous avatar */}
          <AvatarPicker
            label="Share as (anonymous avatar)"
            value={formData.addedBy}
            onChange={(addedBy) => setFormData({ ...formData, addedBy })}
          />


          <div className="pt-4">
            {isUploading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CircularProgress progress={uploadProgress} />
                <p className="text-sm text-[#6B6B6B] font-medium">Uploading file...</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8F9F8A] hover:bg-[#7A8A75] text-white font-medium py-4 rounded-xl transition-colors disabled:opacity-70 flex justify-center items-center gap-2 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Leaf className="w-5 h-5" />}
                {loading ? 'Adding to Library...' : 'Add to Library'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
