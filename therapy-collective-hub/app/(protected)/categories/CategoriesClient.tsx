'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Trash2, Edit3, Check, X, FileText, Heart, ArrowRight } from 'lucide-react';

type CategoryGroup = {
  name: string;
  resources: { id: string; title: string; likeCount: number; loveCount: number }[];
};

export default function CategoriesClient({ initialCategories }: { initialCategories: CategoryGroup[] }) {
  const router = useRouter();
  const [cats, setCats] = useState(initialCategories);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCats(prev => prev.some(c => c.name === name)
          ? prev
          : [...prev, { name, resources: [] }].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName('');
        setShowCreate(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (oldName: string) => {
    const next = editValue.trim();
    if (!next || next === oldName) { setEditName(null); return; }
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: next }),
      });
      if (res.ok) {
        setCats(prev => prev
          .map(c => c.name === oldName ? { ...c, name: next } : c)
          .sort((a, b) => a.name.localeCompare(b.name)));
        setEditName(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (name: string, count: number) => {
    const warning = count > 0
      ? `Delete category "${name}"? The ${count} resource${count === 1 ? '' : 's'} in it will keep their label but the category will no longer be offered for new uploads.`
      : `Delete category "${name}"?`;
    if (!confirm(warning)) return;
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        // Categories still used by resources remain visible; empty ones disappear
        setCats(prev => prev.filter(c => c.name !== name || c.resources.length > 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#4A4A4A]">Categories</h1>
          <p className="text-[#8C8C8C] mt-1">Browse the library by theme, or curate the list.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
              <h3 className="text-lg font-serif text-[#4A4A4A] mb-4">Create New Category</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sleep & Rest"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 focus:border-[#8F9F8A] transition-all"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-3 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-3 bg-[#F0EFEA] hover:bg-[#E8E6E1] text-[#6B6B6B] rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Grid */}
      {cats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-[#E8E6E1]"
        >
          <div className="w-16 h-16 bg-[#F0EFEA] rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-[#8F9F8A]" />
          </div>
          <h3 className="text-xl font-serif text-[#4A4A4A] mb-2">No categories yet</h3>
          <p className="text-[#8C8C8C]">Create your first category to start organizing resources.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {cats.map((cat) => (
              <motion.div
                key={cat.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm hover:shadow-md transition-all group flex flex-col"
              >
                {editName === cat.name ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(cat.name)}
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E6E1] bg-[#FCFCFB] focus:outline-none focus:ring-2 focus:ring-[#8F9F8A]/50 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRename(cat.name)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#8F9F8A] text-white rounded-lg text-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditName(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#F0EFEA] text-[#6B6B6B] rounded-lg text-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                    <p className="text-xs text-[#8C8C8C]">
                      Renaming updates every resource in this category too.
                    </p>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <Link href={`/library?category=${encodeURIComponent(cat.name)}`} className="flex items-center gap-3 group/title">
                        <div className="w-12 h-12 bg-[#F0EFEA] rounded-2xl flex items-center justify-center text-[#8F9F8A]">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#4A4A4A] group-hover/title:text-[#8F9F8A] transition-colors">{cat.name}</h3>
                          <p className="text-xs text-[#8C8C8C]">
                            {cat.resources.length} resource{cat.resources.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditName(cat.name); setEditValue(cat.name); }}
                          className="p-2 text-[#8C8C8C] hover:text-[#4A4A4A] hover:bg-[#F0EFEA] rounded-lg transition-colors"
                          title="Rename category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.name, cat.resources.length)}
                          className="p-2 text-[#8C8C8C] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Resource previews */}
                    {cat.resources.length > 0 ? (
                      <div className="space-y-2 flex-grow">
                        {cat.resources.slice(0, 3).map((resource) => (
                          <Link
                            key={resource.id}
                            href={`/resource/${resource.id}`}
                            className="flex items-center gap-2 px-3 py-2 bg-[#F9F8F6] rounded-xl hover:bg-[#F0EFEA] transition-colors group/item"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#8C8C8C] flex-shrink-0" />
                            <span className="text-sm text-[#4A4A4A] truncate flex-grow group-hover/item:text-[#8F9F8A]">
                              {resource.title}
                            </span>
                            <div className="flex items-center gap-1 text-[#8C8C8C] flex-shrink-0">
                              <Heart className="w-3 h-3" />
                              <span className="text-xs">{resource.likeCount + resource.loveCount}</span>
                            </div>
                          </Link>
                        ))}
                        {cat.resources.length > 3 && (
                          <p className="text-xs text-[#8C8C8C] text-center pt-1">
                            +{cat.resources.length - 3} more resource{cat.resources.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-[#F9F8F6] rounded-xl flex-grow flex items-center justify-center">
                        <p className="text-sm text-[#8C8C8C]">No resources yet</p>
                      </div>
                    )}

                    <Link
                      href={`/library?category=${encodeURIComponent(cat.name)}`}
                      className="mt-4 pt-3 border-t border-[#E8E6E1] text-xs font-medium text-[#8F9F8A] hover:text-[#7A8A75] flex items-center gap-1 transition-colors"
                    >
                      Browse in library <ArrowRight className="w-3 h-3" />
                    </Link>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
