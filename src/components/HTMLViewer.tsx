import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, Eye, Copy, Trash2, Check, Layout, Sparkles, 
  Download, Wand2, Maximize2, Minimize2, AlertCircle, 
  Undo2, Redo2, FileCode, FileUp, FileType, Columns, 
  Split, Monitor, Smartphone, Tablet, Palette, Printer,
  Search, Share2, Image as ImageIcon, Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUndo } from '../hooks/useUndo';
import * as prettier from 'prettier/standalone';
import * as htmlPlugin from 'prettier/plugins/html';
import { HTMLHint } from 'htmlhint';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { sublime } from '@uiw/codemirror-theme-sublime';
import { nord } from '@uiw/codemirror-theme-nord';
import { aura } from '@uiw/codemirror-theme-aura';
import { material } from '@uiw/codemirror-theme-material';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as diff from 'diff';
import LZString from 'lz-string';
import { EditorView } from '@codemirror/view';
import { setSearchQuery, SearchQuery } from '@codemirror/search';
import SnippetLibrary from './SnippetLibrary';

const TEMPLATES = [
  {
    name: 'Vibrant Card',
    code: '<div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; font-family: sans-serif; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">\n  <h1 style="margin: 0; font-size: 24px;">Hello World!</h1>\n  <p style="opacity: 0.9; margin-top: 8px;">Rendered with PolyView HTML Engine</p>\n</div>'
  },
  {
    name: 'Glassmorphism',
    code: '<div style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); padding: 30px; border-radius: 20px; font-family: system-ui; color: #1e293b; text-align: center;">\n  <h2 style="margin-bottom: 10px;">Glass Effect</h2>\n  <p>Modern UI components in seconds.</p>\n  <button style="margin-top: 15px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Action</button>\n</div>'
  },
  {
    name: 'Dark Profile',
    code: '<div style="background: #1e293b; color: white; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 15px; font-family: sans-serif;">\n  <div style="width: 50px; height: 50px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">JD</div>\n  <div>\n    <h4 style="margin: 0;">John Doe</h4>\n    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Software Engineer</p>\n  </div>\n</div>'
  }
];

const QUICK_SNIPPETS = [
  { label: 'Button', code: '<button style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Click Me</button>' },
  { label: 'Card', code: '<div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">\n  <h3>Card Title</h3>\n  <p>Card content goes here...</p>\n</div>' },
  { label: 'Flex Row', code: '<div style="display: flex; gap: 10px; align-items: center;">\n  <div>Item 1</div>\n  <div>Item 2</div>\n</div>' },
  { label: 'Grid', code: '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">\n  <div style="background: #f1f5f9; padding: 10px;">1</div>\n  <div style="background: #f1f5f9; padding: 10px;">2</div>\n</div>' },
  { label: 'Input', code: '<input type="text" placeholder="Enter text..." style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; width: 100%;">' },
  { label: 'Image', code: '<img src="https://picsum.photos/seed/polyview/400/300" alt="Placeholder" style="width: 100%; border-radius: 8px;" referrerPolicy="no-referrer">' }
];

const THEMES = [
  { id: 'github-light', name: 'GitHub Light', theme: githubLight },
  { id: 'github-dark', name: 'GitHub Dark', theme: githubDark },
  { id: 'vscode-dark', name: 'VS Code Dark', theme: vscodeDark },
  { id: 'dracula', name: 'Dracula', theme: dracula },
  { id: 'sublime', name: 'Sublime', theme: sublime },
  { id: 'nord', name: 'Nord', theme: nord },
  { id: 'aura', name: 'Aura', theme: aura },
  { id: 'material', name: 'Material', theme: material },
];

/**
 * HTMLViewer component provides a professional-grade HTML development environment.
 * Features include real-time preview, syntax highlighting, code formatting, 
 * PDF/PNG export, and snippet management.
 * 
 * @returns {JSX.Element} The HTML viewer and editor workspace.
 */
export default function HTMLViewer() {
  const initialCode = useMemo(() => localStorage.getItem('polyview_html_code') || TEMPLATES[0].code, []);
  const [originalCode] = useState(initialCode);
  const { state: code, set: setCode, undo, redo, canUndo, canRedo } = useUndo(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [editorTheme, setEditorTheme] = useState(() => {
    const saved = localStorage.getItem('polyview_editor_theme');
    return THEMES.find(t => t.id === saved) || THEMES[0];
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsFilename, setSaveAsFilename] = useState('');
  const [expandedErrorIdx, setExpandedErrorIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [previewFontSize, setPreviewFontSize] = useState(16);
  const [showQuickSnippets, setShowQuickSnippets] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cmRef = useRef<any>(null);
  const isScrollingRef = useRef<string | null>(null);

  const handleEditorScroll = useCallback((e: Event) => {
    if (isScrollingRef.current === 'preview') return;
    isScrollingRef.current = 'editor';
    
    const editor = e.target as HTMLElement;
    const preview = document.getElementById('preview-content');
    if (preview) {
      const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
      preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    }
    
    setTimeout(() => { isScrollingRef.current = null; }, 50);
  }, []);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current === 'editor') return;
    isScrollingRef.current = 'preview';
    
    const preview = e.currentTarget;
    const editor = cmRef.current?.view?.scrollDOM;
    if (editor) {
      const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      editor.scrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
    }
    
    setTimeout(() => { isScrollingRef.current = null; }, 50);
  }, []);

  useEffect(() => {
    const editor = cmRef.current?.view?.scrollDOM;
    if (editor) {
      editor.addEventListener('scroll', handleEditorScroll);
      return () => editor.removeEventListener('scroll', handleEditorScroll);
    }
  }, [cmRef.current?.view]);

  useEffect(() => {
    if (cmRef.current?.view && searchTerm) {
      const view = cmRef.current.view as EditorView;
      const query = new SearchQuery({ search: searchTerm, caseSensitive: false });
      view.dispatch({ effects: setSearchQuery.of(query) });
    }
  }, [searchTerm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedHtml = params.get('html');
    if (sharedHtml) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedHtml);
        if (decompressed) {
          setCode(decompressed);
          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (e) {
        console.error('Failed to decompress shared HTML', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('polyview_html_code', code);
    setSaveStatus('saving');
    
    const debounceTimer = setTimeout(() => {
      setDebouncedCode(code);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);

    // Auto-save backup every 5 seconds
    const backupTimer = setTimeout(() => {
      localStorage.setItem('polyview_html_code_backup', code);
    }, 5000);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(backupTimer);
    };
  }, [code]);

  useEffect(() => {
    validateHTML(debouncedCode);
  }, [debouncedCode]);

  useEffect(() => {
    localStorage.setItem('polyview_editor_theme', editorTheme.id);
  }, [editorTheme]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleFormat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && window.getSelection()?.toString() === '') {
        // Only trigger custom copy if no text is selected
        // handleCopy(); // Standard browser copy is better for selected text
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleFullscreen('editor');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code]);

  /**
   * Validates HTML content using HTMLHint.
   * @param {string} html - The HTML string to validate.
   */
  const validateHTML = useCallback((html: string) => {
    const messages = HTMLHint.verify(html, {
      "tag-pair": true,
      "attr-lowercase": true,
      "tagname-lowercase": true,
      "id-unique": true,
      "src-not-empty": true,
      "attr-no-duplication": true,
      "tag-self-closing": true
    });
    setErrors(messages);
  }, []);

  /**
   * Copies the current code to the clipboard.
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Clears the current editor content.
   */
  const handleClear = () => setCode('');

  const applyTemplate = (templateCode: string) => {
    setCode(templateCode);
    setShowTemplates(false);
  };

  const insertSnippet = (snippetCode: string) => {
    if (cmRef.current?.view) {
      const view = cmRef.current.view as EditorView;
      const selection = view.state.selection.main;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: snippetCode },
        selection: { anchor: selection.from + snippetCode.length }
      });
      view.focus();
    }
    setShowQuickSnippets(false);
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyview-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Exports the current code with a custom filename.
   */
  const handleSaveAs = () => {
    if (!saveAsFilename.trim()) return;
    const filename = saveAsFilename.endsWith('.html') ? saveAsFilename : `${saveAsFilename}.html`;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveAs(false);
    setSaveAsFilename('');
  };

  /**
   * Formats the HTML code using Prettier.
   */
  const handleFormat = async () => {
    if (isFormatting) return;
    setIsFormatting(true);
    try {
      const formatted = await prettier.format(code, {
        parser: 'html',
        plugins: [htmlPlugin],
        printWidth: 80,
        tabWidth: 2,
      });
      setCode(formatted);
    } catch (err) {
      console.error('Prettier formatting error:', err);
    } finally {
      setIsFormatting(false);
    }
  };

  /**
   * Toggles fullscreen mode for either the editor or the preview pane.
   * @param {('editor'|'preview')} type - The pane to toggle.
   */
  const toggleFullscreen = (type: 'editor' | 'preview') => {
    if (type === 'editor') {
      setIsFullscreenEditor(!isFullscreenEditor);
      setIsFullscreenPreview(false);
    } else {
      setIsFullscreenPreview(!isFullscreenPreview);
      setIsFullscreenEditor(false);
    }
  };

  /**
   * Handles file upload and reads content into the editor.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the file input.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCode(content);
    };
    reader.readAsText(file);
  };

  /**
   * Exports the current preview as an A4 PDF document.
   */
  const handleExportPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('preview-content');
      if (!element) return;

      // Create a temporary container for A4 sizing with high fidelity
      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.padding = '15mm';
      container.style.backgroundColor = 'white';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-9999px';
      container.style.zIndex = '-1000';
      container.className = 'a4-print-container';
      container.innerHTML = code;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 3, // Higher scale for print quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in px at 96dpi
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      const canvasHeightInMm = pdfWidth / ratio;

      // Handle multi-page if content is long
      let heightLeft = canvasHeightInMm;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInMm);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - canvasHeightInMm;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInMm);
        heightLeft -= pdfHeight;
      }

      pdf.save(`polyview-print-${Date.now()}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /**
   * Exports the current preview as a PNG image.
   */
  const handleExportPNG = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      const element = document.getElementById('preview-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `polyview-capture-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('Image export error:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  /**
   * Generates a shareable URL with compressed code.
   */
  const handleShare = () => {
    setIsSharing(true);
    const compressed = LZString.compressToEncodedURIComponent(code);
    const url = new URL(window.location.href);
    url.searchParams.set('html', compressed);
    
    navigator.clipboard.writeText(url.toString());
    setTimeout(() => setIsSharing(false), 2000);
  };

  const diffResult = useMemo(() => {
    if (!showDiff) return null;
    return diff.diffLines(originalCode, code);
  }, [showDiff, originalCode, code]);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layout className="text-blue-600" />
            HTML Engine
            {saveStatus !== 'idle' && (
              <span className={cn(
                "ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all",
                saveStatus === 'saving' ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-emerald-100 text-emerald-600"
              )}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Professional development environment with real-time rendering</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* File Actions */}
          <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Upload HTML"
            >
              <FileUp size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".html,.htm" 
              className="hidden" 
            />
            <button 
              onClick={() => setShowSaveAs(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Save As..."
            >
              <Save size={18} />
            </button>
            <button 
              onClick={handleExport}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Quick Export"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-r border-slate-100 dark:border-slate-700 disabled:opacity-50"
              title="Export A4 PDF"
            >
              <Printer size={18} className={cn(isGeneratingPDF && "animate-pulse")} />
            </button>
            <button 
              onClick={handleExportPNG}
              disabled={isExportingImage}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-r border-slate-100 dark:border-slate-700 disabled:opacity-50"
              title="Export PNG Image"
            >
              <ImageIcon size={18} className={cn(isExportingImage && "animate-pulse")} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
              title="Share Snippet"
            >
              {isSharing ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
            </button>
            <button 
              onClick={() => setShowSnippets(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-l border-slate-100 dark:border-slate-700"
              title="Snippet Library"
            >
              <Save size={18} />
            </button>
          </div>

          {/* History Actions */}
          <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button 
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
          </div>

          {/* Editor Settings */}
          <div className="flex gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowThemes(!showThemes)}
                className={cn(
                  "p-2 rounded-xl border transition-all shadow-sm",
                  showThemes 
                    ? "bg-slate-900 border-slate-900 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400"
                )}
                title="Editor Theme"
              >
                <Palette size={18} />
              </button>
              <AnimatePresence>
                {showThemes && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setEditorTheme(t);
                            setShowThemes(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            editorTheme.id === t.id 
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setShowDiff(!showDiff)}
              className={cn(
                "p-2 rounded-xl border transition-all shadow-sm",
                showDiff 
                  ? "bg-amber-600 border-amber-600 text-white" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400"
              )}
              title="Toggle Diff View"
            >
              <Split size={18} />
            </button>

            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "p-2 rounded-xl border transition-all shadow-sm",
                showPreview 
                  ? "bg-blue-600 border-blue-600 text-white" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400"
              )}
              title={showPreview ? "Hide Preview" : "Show Preview"}
            >
              <Eye size={18} />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowQuickSnippets(!showQuickSnippets)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm font-medium text-sm",
                  showQuickSnippets 
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400"
                )}
              >
                <FileCode size={18} />
                <span className="hidden sm:inline">Snippets</span>
              </button>
              <AnimatePresence>
                {showQuickSnippets && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {QUICK_SNIPPETS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => insertSnippet(s.code)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          <Code2 size={14} className="text-indigo-500" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm font-medium text-sm",
                  showTemplates 
                    ? "bg-blue-600 border-blue-600 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400"
                )}
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Templates</span>
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => applyTemplate(t.code)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          <Layout size={14} className="text-amber-500" />
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div 
        className="grid gap-6 flex-1 min-h-0"
        style={{
          gridTemplateColumns: isFullscreenEditor || isFullscreenPreview || !showPreview ? '1fr' : 'repeat(auto-fit, minmax(0, 1fr))',
          gridTemplateRows: '1fr'
        }}
      >
        {/* Editor Pane */}
        <div 
          ref={editorRef}
          className={cn(
            "flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all",
            isFullscreenEditor ? "fixed inset-4 z-[60]" : "relative",
            isFullscreenPreview && "hidden lg:flex",
            !showPreview && !isFullscreenEditor && "w-full"
          )}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">Editor</span>
              </div>
              
              <div className="flex-1 max-w-xs relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={handleFormat}
                  disabled={isFormatting}
                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Format (Ctrl+S)"
                >
                  <Wand2 size={14} className={cn(isFormatting && "animate-spin")} />
                </button>
                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
                <button 
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Clear"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setEditorFontSize(Math.max(8, editorFontSize - 1))}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                title="Decrease Editor Font Size"
              >
                <Minimize2 size={14} />
              </button>
              <span className="text-[10px] font-bold text-slate-500 min-w-[24px] text-center">{editorFontSize}</span>
              <button 
                onClick={() => setEditorFontSize(Math.min(32, editorFontSize + 1))}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                title="Increase Editor Font Size"
              >
                <Maximize2 size={14} />
              </button>
            </div>
            <button 
              onClick={() => toggleFullscreen('editor')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {isFullscreenEditor ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
          
          <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
            {showDiff ? (
              <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950">
                {diffResult?.map((part, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "whitespace-pre-wrap px-2 py-0.5 rounded",
                      part.added ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                      part.removed ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 line-through" :
                      "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {part.value}
                  </div>
                ))}
              </div>
            ) : (
              <CodeMirror
                ref={cmRef}
                value={code}
                height="100%"
                theme={editorTheme.theme}
                extensions={[html()]}
                onChange={(value) => setCode(value)}
                className="flex-1 text-sm overflow-auto"
                style={{ fontSize: `${editorFontSize}px` }}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBrackets: true,
                  searchKeymap: true,
                }}
              />
            )}
            
            {/* Validation Panel */}
            {errors.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 flex flex-col max-h-[40%] shadow-2xl">
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 flex items-center justify-between border-b border-red-100 dark:border-red-900/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle size={14} />
                    <span>Syntax Issues ({errors.length})</span>
                  </div>
                  <button 
                    onClick={() => setErrors([])}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {errors.map((err, idx) => {
                    const isExpanded = expandedErrorIdx === idx;
                    
                    // Simple suggested fixes based on common htmlhint rules
                    let suggestion = '';
                    if (err.rule.id === 'tag-pair') suggestion = 'Ensure all tags are properly closed and nested.';
                    if (err.rule.id === 'attr-lowercase') suggestion = 'Convert attribute names to lowercase.';
                    if (err.rule.id === 'tagname-lowercase') suggestion = 'Convert tag names to lowercase.';
                    if (err.rule.id === 'id-unique') suggestion = 'Ensure each ID is unique within the document.';
                    if (err.rule.id === 'src-not-empty') suggestion = 'Provide a non-empty source URL for this tag.';
                    if (err.rule.id === 'attr-no-duplication') suggestion = 'Remove duplicate attributes from this tag.';

                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "rounded-xl border transition-all overflow-hidden",
                          isExpanded 
                            ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30" 
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/30"
                        )}
                      >
                        <button 
                          onClick={() => {
                            setExpandedErrorIdx(isExpanded ? null : idx);
                            if (cmRef.current?.view) {
                              const view = cmRef.current.view as EditorView;
                              const line = view.state.doc.line(err.line);
                              view.dispatch({
                                selection: { anchor: line.from, head: line.to },
                                scrollIntoView: true
                              });
                              view.focus();
                            }
                          }}
                          className="w-full px-3 py-2 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">L{err.line}</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{err.message}</span>
                          </div>
                          <div className={cn("transition-transform", isExpanded && "rotate-180")}>
                            <Maximize2 size={12} className="text-slate-400" />
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-3 pb-3 border-t border-red-100 dark:border-red-900/20 pt-2"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context</span>
                                  <code className="text-[10px] font-mono bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-100 dark:border-slate-800 block overflow-x-auto text-red-500 dark:text-red-400">
                                    {err.evidence}
                                  </code>
                                </div>
                                {suggestion && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Suggested Fix</span>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">{suggestion}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div 
            ref={previewRef}
            className={cn(
              "flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all",
              isFullscreenPreview ? "fixed inset-4 z-[60]" : "relative",
              isFullscreenEditor && "hidden lg:flex"
            )}
          >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Live Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button 
                  onClick={() => setPreviewFontSize(Math.max(8, previewFontSize - 1))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                  title="Decrease Preview Font Size"
                >
                  <Minimize2 size={14} />
                </button>
                <span className="text-[10px] font-bold text-slate-500 min-w-[24px] text-center">{previewFontSize}</span>
                <button 
                  onClick={() => setPreviewFontSize(Math.min(48, previewFontSize + 1))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                  title="Increase Preview Font Size"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={cn("p-1 rounded-md transition-all", previewMode === 'desktop' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={cn("p-1 rounded-md transition-all", previewMode === 'tablet' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                  title="Tablet View"
                >
                  <Tablet size={14} />
                </button>
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={cn("p-1 rounded-md transition-all", previewMode === 'mobile' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400")}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>
            <button 
              onClick={() => toggleFullscreen('preview')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {isFullscreenPreview ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950/50 flex justify-center items-start">
            <div 
              id="preview-content"
              onScroll={handlePreviewScroll}
              className={cn(
                "bg-white shadow-2xl rounded-lg border border-slate-200 dark:border-slate-800 transition-all duration-500 overflow-auto",
                previewMode === 'desktop' ? "w-full h-full" :
                previewMode === 'tablet' ? "w-[768px] h-[1024px] max-w-full" :
                "w-[375px] h-[667px] max-w-full"
              )}
              style={{ fontSize: `${previewFontSize}px` }}
              dangerouslySetInnerHTML={{ __html: debouncedCode }}
            />
          </div>
        </div>
      )}
      </div>

      <SnippetLibrary 
        isOpen={showSnippets}
        onClose={() => setShowSnippets(false)}
        onSelect={(newCode, type) => {
          if (type === 'html') setCode(newCode);
        }}
        currentCode={code}
        currentType="html"
      />

      {/* Save As Modal */}
      <AnimatePresence>
        {showSaveAs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveAs(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Save As...</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filename</label>
                  <input 
                    type="text"
                    placeholder="my-project.html"
                    value={saveAsFilename}
                    onChange={(e) => setSaveAsFilename(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowSaveAs(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveAs}
                    disabled={!saveAsFilename.trim()}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
