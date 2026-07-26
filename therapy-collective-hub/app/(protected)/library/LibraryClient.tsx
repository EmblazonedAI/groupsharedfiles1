'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Video, Headphones, BookOpen, Link as LinkIcon, Image as ImageIcon, File, Heart, MessageCircle, Leaf, Plus, X, Paperclip, Trash2, ExternalLink, LayoutGrid, List, Download, RotateCcw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { FORMATS } from '@/lib/config';
import { formatDistanceToNow, format as formatDate } from 'date-fns';
import PdfThumbnail from '@/components/PdfThumbnail';
import { isImageUrl, isPdfUrl, getBlobProxyUrl, getFileName, getFileExtension, getDomain } from '@/lib/files';

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

const openInNewTab = (e: React.MouseEvent, url: string) => {
  e.preventDefault();
  e.stopPropagation();
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function LibraryClient({
  initialResources,
  initialCategory,
  initialTag,
  justDeletedId,
  trashedResources,
}: {
  initialResources: any[],
  initialCategory?: string | null,
  initialTag?: string | null,
  justDeletedId?: string | null,
  trashedResources?: any[],
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag || null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'loved' | 'discussed'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [removeMode, setRemoveMode] = useState(false);
  const [trash, setTrash] = useState<any[]>(trashedResources || []);
  const [showTrash, setShowTrash] = useState(false);
  const [undoDismissed, setUndoDismissed] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  // "New since your last visit" is computed purely from this browser's
  // localStorage — nothing is sent to the server and no cookies are set.
  const [newSince, setNewSince] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setAllCategories).catch(() => { });
    if (localStorage.getItem('library-view') === 'list') setViewMode('list');
    const lastVisit = parseInt(localStorage.getItem('library-last-visit') || '0', 10);
    if (lastVisit) setNewSince(lastVisit);
    localStorage.setItem('library-last-visit', String(Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNew = (r: any) => newSince != null && new Date(r.addedAt).getTime() > newSince;
  const newCount = useMemo(
    () => (newSince == null ? 0 : initialResources.filter(isNew).length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialResources, newSince]
  );

  const justDeleted = justDeletedId ? trash.find(t => t.id === justDeletedId) : null;

  const handleRestore = async (id: string) => {
    setRestoring(id);
    try {
      const res = await fetch(`/api/resources/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setTrash(prev => prev.filter(t => t.id !== id));
        setUndoDismissed(true);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRestoring(null);
    }
  };

  const changeView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('library-view', mode);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        setAllCategories(prev => [...new Set([...prev, newCategoryName.trim()])].sort());
        setNewCategoryName('');
        setShowAddCategory(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteCategory = async (name: string) => {
    if (!confirm(`Delete category "${name}"? Resources using this category will keep their current category label.`)) return;
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        setAllCategories(prev => prev.filter(c => c !== name));
        if (selectedCategory === name) setSelectedCategory(null);
      }
    } catch (err) { console.error(err); }
  };

  const filteredResources = useMemo(() => {
    let result = [...initialResources];

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(lowerSearch) ||
        r.description?.toLowerCase().includes(lowerSearch) ||
        r.tags?.some((t: string) => t.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedCategory) {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (selectedFormat) {
      result = result.filter(r => r.format === selectedFormat);
    }

    if (selectedTag) {
      result = result.filter(r => r.tags?.includes(selectedTag));
    }

    const lastCommentAt = (r: any) =>
      r.comments?.length ? Math.max(...r.comments.map((c: any) => new Date(c.createdAt).getTime())) : 0;

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      if (sortBy === 'oldest') return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'loved') return (b.likeCount + b.loveCount) - (a.likeCount + a.loveCount);
      if (sortBy === 'discussed') {
        return lastCommentAt(b) - lastCommentAt(a)
          || new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
      return 0;
    });

    return result;
  }, [initialResources, search, selectedCategory, selectedFormat, selectedTag, sortBy]);

  const renderThumbnail = (resource: any, className: string, showPageCount = true) => {
    if (resource.blobUrl && isImageUrl(resource.blobUrl)) {
      return (
        <div className={`${className} bg-[#F9F8F6] overflow-hidden`}>
          <img
            src={getBlobProxyUrl(resource.blobUrl)}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      );
    }
    if (resource.blobUrl && isPdfUrl(resource.blobUrl)) {
      return <PdfThumbnail src={getBlobProxyUrl(resource.blobUrl)} className={className} showPageCount={showPageCount} />;
    }
    if (resource.url) {
      return (
        <div className={`${className} bg-[#F0EFEA] overflow-hidden`}>
          <img
            src={resource.ogImage || `https://image.thum.io/get/width/1200/${resource.url}`}
            alt=""
            className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Undo banner after a delete */}
      <AnimatePresence>
        {justDeleted && !undoDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center gap-3 px-5 py-3.5 bg-white border border-[#E8E6E1] rounded-2xl shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-[#8C8C8C] flex-shrink-0" />
            <span className="text-sm text-[#4A4A4A]">
              <span className="font-medium">“{justDeleted.title}”</span> moved to Recently deleted.
            </span>
            <button
              onClick={() => handleRestore(justDeleted.id)}
              disabled={restoring === justDeleted.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {restoring === justDeleted.id ? 'Restoring…' : 'Undo'}
            </button>
            <span className="text-xs text-[#8C8C8C]">You can restore it for 30 days.</span>
            <button
              onClick={() => setUndoDismissed(true)}
              className="ml-auto p-1.5 text-[#8C8C8C] hover:text-[#4A4A4A] rounded-lg"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New since last visit (computed on this device only) */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-5 py-3 bg-[#F0EFEA] border border-[#E8E6E1] rounded-2xl"
          >
            <Sparkles className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />
            <span className="text-sm text-[#4A4A4A]">
              {newCount} new resource{newCount === 1 ? '' : 's'} since your last visit — look for the <span className="inline-block bg-[#8F9F8A] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md align-middle">NEW</span> badge.
            </span>
            <button
              onClick={() => setNewSince(null)}
              className="ml-auto p-1.5 text-[#8C8C8C] hover:text-[#4A4A4A] rounded-lg"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-serif text-[#4A4A4A]">Resource Library</h1>
          <p className="text-[#8C8C8C] mt-1">A curated collection of tools and insights.</p>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C8C]" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E6E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedFormat ?? ''}
              onChange={(e) => setSelectedFormat(e.target.value || null)}
              className="px-3 py-2 rounded-xl border border-[#E8E6E1] bg-white text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
            >
              <option value="">All formats</option>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#E8E6E1] bg-white text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A-Z</option>
              <option value="loved">Most loved</option>
              <option value="discussed">Recently discussed</option>
            </select>
            <div className="flex rounded-xl border border-[#E8E6E1] bg-white overflow-hidden flex-shrink-0">
              <button
                onClick={() => changeView('grid')}
                className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-[#8F9F8A] text-white' : 'text-[#8C8C8C] hover:bg-[#F0EFEA]'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeView('list')}
                className={`px-3 py-2 transition-colors ${viewMode === 'list' ? 'bg-[#8F9F8A] text-white' : 'text-[#8C8C8C] hover:bg-[#F0EFEA]'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? 'bg-[#8F9F8A] text-white' : 'bg-white border border-[#E8E6E1] text-[#6B6B6B] hover:bg-[#F0EFEA]'}`}
        >
          All Categories
        </button>
        {allCategories.map(cat => (
          <div key={cat} className="relative inline-flex">
            <button
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cat === selectedCategory ? 'bg-[#8F9F8A] text-white' : 'bg-white border border-[#E8E6E1] text-[#6B6B6B] hover:bg-[#F0EFEA]'}`}
            >
              {cat}
            </button>
            {removeMode && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse"
                title="Delete category"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
        {showAddCategory ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="New category..."
              className="px-3 py-1 rounded-full text-xs border border-[#8F9F8A] bg-white focus:outline-none focus:ring-1 focus:ring-[#8F9F8A] w-36"
              autoFocus
            />
            <button onClick={handleAddCategory} className="p-1 text-[#8F9F8A] hover:text-[#7A8A75]">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="p-1 text-[#8C8C8C] hover:text-[#4A4A4A]">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#8F9F8A] text-[#8F9F8A] hover:bg-[#F0EFEA] transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
        <button
          onClick={() => setRemoveMode(!removeMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${removeMode ? 'bg-red-100 text-red-500 border border-red-200' : 'border border-dashed border-red-300 text-red-400 hover:bg-red-50'}`}
        >
          <Trash2 className="w-3 h-3" /> {removeMode ? 'Done' : 'Remove'}
        </button>
      </div>

      {/* Result count & active tag + backup download */}
      <div className="flex flex-wrap items-center gap-3 -mt-4">
        <p className="text-xs text-[#8C8C8C]">
          Showing {filteredResources.length} of {initialResources.length} resources
        </p>
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#8F9F8A] text-white rounded-full text-xs font-medium hover:bg-[#7A8A75] transition-colors"
            title="Clear tag filter"
          >
            Tag: {selectedTag}
            <X className="w-3 h-3" />
          </button>
        )}
        <a
          href="/api/export"
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#4A4A4A] bg-white hover:bg-[#F0EFEA] border border-[#E8E6E1] rounded-xl transition-colors"
          title="Download every resource and file as a zip backup"
        >
          <Download className="w-3.5 h-3.5" />
          Download everything (.zip)
        </a>
      </div>

      {/* Grid / List */}
      {filteredResources.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-[#E8E6E1]"
        >
          <div className="w-16 h-16 bg-[#F0EFEA] rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-[#8F9F8A]" />
          </div>
          <h3 className="text-xl font-serif text-[#4A4A4A] mb-2">No resources found</h3>
          <p className="text-[#8C8C8C]">Try adjusting your search or filters, or add a new resource.</p>
        </motion.div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredResources.map((resource) => {
              const Icon = getFormatIcon(resource.format);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  key={resource.id}
                >
                  <Link href={`/resource/${resource.id}`}>
                    <div className="bg-white rounded-2xl border border-[#E8E6E1] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 p-4 group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#E8E6E1]">
                        {renderThumbnail(resource, 'w-16 h-16', false) || (
                          <div className="w-full h-full bg-[#F0EFEA] flex items-center justify-center text-[#8F9F8A]">
                            <Icon className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#4A4A4A] truncate group-hover:text-[#8F9F8A] transition-colors">
                            {resource.title}
                          </h3>
                          {isNew(resource) && (
                            <span className="bg-[#8F9F8A] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0">NEW</span>
                          )}
                        </div>
                        {resource.description && (
                          <p className="text-sm text-[#6B6B6B] truncate mt-0.5">{resource.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-[#8C8C8C] mt-1.5 flex-wrap">
                          <span className="uppercase tracking-wider font-medium">{resource.format}</span>
                          <span aria-hidden>·</span>
                          <span>{resource.category}</span>
                          <span aria-hidden>·</span>
                          <span title={`${formatDistanceToNow(new Date(resource.addedAt))} ago`}>
                            {formatDate(new Date(resource.addedAt), 'd MMM yyyy')}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {resource.likeCount + resource.loveCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {resource.comments?.length || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {resource.blobUrl && (
                          <button
                            onClick={(e) => openInNewTab(e, getBlobProxyUrl(resource.blobUrl))}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F0EFEA] hover:bg-[#8F9F8A] text-[#8F9F8A] hover:text-white rounded-xl transition-colors"
                            title={`Open ${getFileName(resource.blobUrl, resource.title)}`}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Open {getFileExtension(resource.blobUrl) || 'file'}</span>
                          </button>
                        )}
                        {resource.url && (
                          <button
                            onClick={(e) => openInNewTab(e, resource.url)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F9F8F6] hover:bg-[#F0EFEA] text-[#6B6B6B] rounded-xl border border-[#E8E6E1] transition-colors"
                            title={`Visit ${getDomain(resource.url)}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Visit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredResources.map((resource) => {
              const Icon = getFormatIcon(resource.format);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={resource.id}
                >
                  <Link href={`/resource/${resource.id}`}>
                    <div className="bg-white rounded-3xl border border-[#E8E6E1] shadow-sm hover:shadow-md transition-all cursor-pointer h-full flex flex-col group overflow-hidden">
                      {renderThumbnail(resource, 'w-full h-40')}

                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-[#F0EFEA] rounded-xl text-[#8F9F8A] group-hover:bg-[#8F9F8A] group-hover:text-white transition-colors">
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
                              {resource.format}
                            </span>
                            {isNew(resource) && (
                              <span className="bg-[#8F9F8A] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">NEW</span>
                            )}
                          </div>
                          <span className="flex-shrink-0 bg-[#F9F8F6] px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B6B6B] border border-[#E8E6E1] max-w-[150px] truncate">
                            {resource.category}
                          </span>
                        </div>

                        <h3 className="text-lg font-medium text-[#4A4A4A] mb-2 line-clamp-2 group-hover:text-[#8F9F8A] transition-colors">
                          {resource.title}
                        </h3>

                        <p className="text-sm text-[#6B6B6B] line-clamp-2 mb-4 flex-grow">
                          {resource.description || 'No description provided.'}
                        </p>

                        {/* Quick open: attached file */}
                        {resource.blobUrl && (
                          <button
                            onClick={(e) => openInNewTab(e, getBlobProxyUrl(resource.blobUrl))}
                            className="w-full flex items-center gap-2 text-xs text-[#8F9F8A] bg-[#F0EFEA] hover:bg-[#8F9F8A] hover:text-white px-3 py-2 rounded-lg mb-3 transition-colors group/file"
                            title={`Open ${getFileName(resource.blobUrl, resource.title)} in a new tab`}
                          >
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate font-medium">{getFileName(resource.blobUrl, resource.title)}</span>
                            <span className="ml-auto flex items-center gap-1 flex-shrink-0 font-semibold uppercase tracking-wider">
                              Open <ExternalLink className="w-3 h-3" />
                            </span>
                          </button>
                        )}

                        {/* Quick open: external link */}
                        {resource.url && (
                          <button
                            onClick={(e) => openInNewTab(e, resource.url)}
                            className="w-full flex items-center gap-2 text-xs text-[#8C8C8C] bg-[#F9F8F6] hover:bg-[#F0EFEA] hover:text-[#4A4A4A] px-3 py-2 rounded-lg mb-3 transition-colors"
                            title={`Visit ${getDomain(resource.url)} in a new tab`}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${getDomain(resource.url)}&sz=16`}
                              alt=""
                              className="w-3.5 h-3.5"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="truncate">{getDomain(resource.url)}</span>
                            <span className="ml-auto flex items-center gap-1 flex-shrink-0 font-semibold uppercase tracking-wider">
                              Visit <ExternalLink className="w-3 h-3" />
                            </span>
                          </button>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {resource.tags?.slice(0, 3).map((tag: string) => (
                            <button
                              key={tag}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTag(tag === selectedTag ? null : tag); }}
                              className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider transition-colors ${tag === selectedTag ? 'bg-[#8F9F8A] text-white' : 'bg-[#F9F8F6] text-[#8C8C8C] hover:bg-[#F0EFEA] hover:text-[#4A4A4A]'}`}
                              title={`Filter by "${tag}"`}
                            >
                              {tag}
                            </button>
                          ))}
                          {resource.tags?.length > 3 && (
                            <span className="px-2 py-1 bg-[#F9F8F6] rounded-md text-[10px] text-[#8C8C8C] uppercase tracking-wider">
                              +{resource.tags.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#E8E6E1] text-xs text-[#8C8C8C]">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <Heart className="w-3.5 h-3.5" />
                              <span>{resource.likeCount + resource.loveCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{resource.comments?.length || 0}</span>
                            </div>
                          </div>
                          <span title={`${formatDistanceToNow(new Date(resource.addedAt))} ago`}>
                            {formatDate(new Date(resource.addedAt), 'd MMM yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Recently deleted */}
      {trash.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[#F9F8F6] transition-colors"
          >
            <Trash2 className="w-4 h-4 text-[#8C8C8C]" />
            <span className="text-sm font-medium text-[#6B6B6B]">
              Recently deleted ({trash.length})
            </span>
            <span className="text-xs text-[#8C8C8C] hidden sm:inline">
              — items are permanently removed after 30 days
            </span>
            {showTrash ? <ChevronUp className="w-4 h-4 text-[#8C8C8C] ml-auto" /> : <ChevronDown className="w-4 h-4 text-[#8C8C8C] ml-auto" />}
          </button>
          <AnimatePresence>
            {showTrash && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-5 space-y-2 border-t border-[#E8E6E1] pt-4">
                  {trash.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-[#F9F8F6] rounded-xl">
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-[#4A4A4A] truncate">{item.title}</p>
                        <p className="text-xs text-[#8C8C8C]">
                          Deleted {formatDistanceToNow(new Date(item.deletedAt))} ago · {item.category}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(item.id)}
                        disabled={restoring === item.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-[#F0EFEA] text-[#6B6B6B] border border-[#E8E6E1] rounded-xl transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoring === item.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
