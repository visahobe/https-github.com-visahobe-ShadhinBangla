import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Trash2, Plus, FileCode, Sigma, Copy, Check, Save, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface Snippet {
  id: string;
  name: string;
  code: string;
  type: 'html' | 'latex';
  createdAt: number;
}

interface SnippetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string, type: 'html' | 'latex') => void;
  currentCode?: string;
  currentType?: 'html' | 'latex';
}

/**
 * SnippetLibrary component for managing saved code snippets.
 * Allows users to save, load, delete, and search for snippets.
 * Also provides functionality to export and import user preferences.
 * 
 * @param {SnippetLibraryProps} props - The component props.
 * @returns {JSX.Element} The snippet library modal.
 */
export default function SnippetLibrary({ isOpen, onClose, onSelect, currentCode, currentType }: SnippetLibraryProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'html' | 'latex'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSnippetName, setNewSnippetName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('polyview_snippets');
    if (saved) {
      setSnippets(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('polyview_snippets', JSON.stringify(snippets));
  }, [snippets]);

  const addSnippet = () => {
    if (!currentCode || !currentType || !newSnippetName.trim()) return;
    
    const newSnippet: Snippet = {
      id: Date.now().toString(),
      name: newSnippetName.trim(),
      code: currentCode,
      type: currentType,
      createdAt: Date.now(),
    };
    
    setSnippets([newSnippet, ...snippets]);
    setNewSnippetName('');
    setIsAdding(false);
  };

  /**
   * Deletes a snippet from the library by its ID.
   * 
   * @param {string} id - The ID of the snippet to delete.
   */
  const deleteSnippet = (id: string) => {
    setSnippets(snippets.filter(s => s.id !== id));
  };

  /**
   * Copies a snippet's code to the clipboard.
   * 
   * @param {Snippet} snippet - The snippet to copy.
   */
  const copySnippet = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSnippets = snippets.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  /**
   * Exports all application preferences and snippets to a JSON file.
   */
  const exportPreferences = () => {
    const prefs: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('polyview_')) {
        prefs[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyview-preferences-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Imports application preferences and snippets from a JSON file.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
   */
  const importPreferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const prefs = JSON.parse(event.target?.result as string);
        Object.entries(prefs).forEach(([key, value]) => {
          if (key.startsWith('polyview_') && typeof value === 'string') {
            localStorage.setItem(key, value);
          }
        });
        window.location.reload();
      } catch (err) {
        console.error('Failed to import preferences', err);
        alert('Invalid preferences file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Save className="text-blue-600" size={20} />
                  Snippet Library
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your frequently used code blocks</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search snippets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['all', 'html', 'latex'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                        typeFilter === type 
                          ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={exportPreferences}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  title="Export all preferences"
                >
                  <Download size={14} />
                  <span>Export Prefs</span>
                </button>
                <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer">
                  <Upload size={14} />
                  <span>Import Prefs</span>
                  <input type="file" accept=".json" onChange={importPreferences} className="hidden" />
                </label>
              </div>
            </div>

            {/* Add Snippet Section */}
            {currentCode && (
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20">
                {!isAdding ? (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                  >
                    <Plus size={18} />
                    Save Current Code as Snippet
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Snippet name..."
                      value={newSnippetName}
                      onChange={(e) => setNewSnippetName(e.target.value)}
                      autoFocus
                      className="flex-1 px-4 py-2 text-sm bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <button 
                      onClick={addSnippet}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="px-4 py-2 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Snippet List */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {filteredSnippets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileCode size={48} className="mb-4 opacity-20" />
                  <p className="text-sm italic">No snippets found</p>
                </div>
              ) : (
                filteredSnippets.map((snippet) => (
                  <div 
                    key={snippet.id}
                    className="group bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {snippet.type === 'html' ? (
                          <FileCode size={16} className="text-blue-500" />
                        ) : (
                          <Sigma size={16} className="text-purple-500" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{snippet.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{snippet.type}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copySnippet(snippet)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Copy code"
                        >
                          {copiedId === snippet.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button 
                          onClick={() => deleteSnippet(snippet.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete snippet"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <pre className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 max-h-24 overflow-hidden mask-fade-bottom">
                        {snippet.code}
                      </pre>
                      <button 
                        onClick={() => {
                          onSelect(snippet.code, snippet.type);
                          onClose();
                        }}
                        className="absolute inset-0 w-full h-full flex items-center justify-center bg-blue-600/0 hover:bg-blue-600/10 transition-all group/btn"
                      >
                        <span className="opacity-0 group-hover/btn:opacity-100 bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg">Load Snippet</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
