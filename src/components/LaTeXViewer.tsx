import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sigma, Eye, Copy, Trash2, Check, Layout, Sparkles, 
  Maximize2, Minimize2, Undo2, Redo2, Palette, Share2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUndo } from '../hooks/useUndo';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import CodeMirror from '@uiw/react-codemirror';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { sublime } from '@uiw/codemirror-theme-sublime';
import { nord } from '@uiw/codemirror-theme-nord';
import { aura } from '@uiw/codemirror-theme-aura';
import { material } from '@uiw/codemirror-theme-material';
import LZString from 'lz-string';
import SnippetLibrary from './SnippetLibrary';
import { Save, FileCode, Code2 } from 'lucide-react';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';

const TEMPLATES = [
  {
    name: 'Calculus',
    code: '\\int_{a}^{b} x^2 dx = \\frac{b^3 - a^3}{3}'
  },
  {
    name: "Euler's Identity",
    code: 'e^{i\\pi} + 1 = 0'
  },
  {
    name: 'Quadratic Formula',
    code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
  },
  {
    name: 'Schrödinger Eq',
    code: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r},t) = \\hat{H} \\Psi(\\mathbf{r},t)'
  }
];

const QUICK_SNIPPETS = [
  { label: 'Equation', code: '\\begin{equation}\n  \n\\end{equation}' },
  { label: 'Align', code: '\\begin{align}\n  & \\\\\n  & \n\\end{align}' },
  { label: 'Fraction', code: '\\frac{}{}' },
  { label: 'Sum', code: '\\sum_{i=1}^{n}' },
  { label: 'Integral', code: '\\int_{}^{}' },
  { label: 'Matrix', code: '\\begin{pmatrix}\n  & \\\\\n  & \n\\end{pmatrix}' },
  { label: 'Square Root', code: '\\sqrt{}' },
  { label: 'Greek Alpha', code: '\\alpha' },
  { label: 'Greek Beta', code: '\\beta' },
  { label: 'Greek Gamma', code: '\\gamma' },
  { label: 'Greek Delta', code: '\\delta' },
  { label: 'Greek Theta', code: '\\theta' },
  { label: 'Greek Sigma', code: '\\sigma' },
  { label: 'Greek Omega', code: '\\omega' }
];

const LATEX_COMMANDS = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'begin', 'end', 'equation', 'align', 'frac', 'sqrt', 'sum', 'int', 'prod', 'lim', 'infty', 'partial', 'nabla', 'forall', 'exists', 'in', 'notin', 'subset', 'supset', 'cup', 'cap', 'vee', 'wedge',
  'left', 'right', 'pmatrix', 'bmatrix', 'vmatrix', 'cases', 'text', 'mathbf', 'mathit', 'mathbb', 'mathcal', 'mathfrak', 'mathsf', 'mathtt'
];

function latexCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\\[\w]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: LATEX_COMMANDS.map(cmd => ({ label: `\\${cmd}`, type: 'keyword' }))
  };
}

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
 * LaTeXViewer component for rendering mathematical expressions.
 * Uses KaTeX for high-performance rendering and CodeMirror for editing.
 * 
 * @returns {JSX.Element} The LaTeX viewer and editor workspace.
 */
export default function LaTeXViewer() {
  const initialCode = useMemo(() => localStorage.getItem('polyview_latex_code') || TEMPLATES[0].code, []);
  const { state: code, set: setCode, undo, redo, canUndo, canRedo } = useUndo(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [editorTheme, setEditorTheme] = useState(THEMES[1]);
  const [isSharing, setIsSharing] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [previewFontSize, setPreviewFontSize] = useState(24);
  const [showQuickSnippets, setShowQuickSnippets] = useState(false);
  const cmRef = useRef<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedLatex = params.get('latex');
    if (sharedLatex) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedLatex);
        if (decompressed) {
          setCode(decompressed);
          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (e) {
        console.error('Failed to decompress shared LaTeX', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('polyview_latex_code', code);
    setSaveStatus('saving');
    
    const debounceTimer = setTimeout(() => {
      setDebouncedCode(code);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);

    // Auto-save backup every 5 seconds
    const backupTimer = setTimeout(() => {
      localStorage.setItem('polyview_latex_code_backup', code);
    }, 5000);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(backupTimer);
    };
  }, [code]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setCode('');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && window.getSelection()?.toString() === '') {
        // Custom copy all if nothing selected
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        setIsFullscreenEditor(!isFullscreenEditor);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, undo, redo, isFullscreenEditor]);

  /**
   * Copies the current LaTeX code to the clipboard.
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
   * Generates a shareable URL with compressed LaTeX code.
   */
  const handleShare = () => {
    setIsSharing(true);
    const compressed = LZString.compressToEncodedURIComponent(code);
    const url = new URL(window.location.href);
    url.searchParams.set('latex', compressed);
    
    navigator.clipboard.writeText(url.toString());
    setTimeout(() => setIsSharing(false), 2000);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sigma className="text-purple-600" />
            LaTeX Engine
            {saveStatus !== 'idle' && (
              <span className={cn(
                "ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all",
                saveStatus === 'saving' ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-emerald-100 text-emerald-600"
              )}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Render complex mathematical expressions with KaTeX</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* History Actions */}
          <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button 
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-30 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-30 transition-colors border-r border-slate-100 dark:border-slate-700"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="Share Snippet"
            >
              {isSharing ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
            </button>
            <button 
              onClick={() => setShowSnippets(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors border-l border-slate-100 dark:border-slate-700"
              title="Snippet Library"
            >
              <Save size={18} />
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
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-400"
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
                              ? "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold" 
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

            <div className="relative">
              <button 
                onClick={() => setShowQuickSnippets(!showQuickSnippets)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm font-medium text-sm",
                  showQuickSnippets 
                    ? "bg-purple-600 border-purple-600 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-400"
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
                          <Code2 size={14} className="text-purple-500" />
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
                    ? "bg-purple-600 border-purple-600 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-400"
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
                          <Sigma size={14} className="text-purple-500" />
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

      <div className={cn(
        "grid gap-6 flex-1 min-h-0",
        isFullscreenEditor || isFullscreenPreview ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {/* Editor Pane */}
        <div className={cn(
          "flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all",
          isFullscreenEditor ? "fixed inset-4 z-[60]" : "relative",
          isFullscreenPreview && "hidden lg:flex"
        )}>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sigma size={16} className="text-purple-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">LaTeX Source</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              ref={cmRef}
              value={code}
              height="100%"
              theme={editorTheme.theme}
              extensions={[StreamLanguage.define(stex), autocompletion({ override: [latexCompletions] })]}
              onChange={(value) => setCode(value)}
              className="h-full text-sm"
              style={{ fontSize: `${editorFontSize}px` }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                closeBrackets: true,
                bracketMatching: true,
                autocompletion: true,
                indentOnInput: true,
                syntaxHighlighting: true,
              }}
            />
          </div>
        </div>

        {/* Preview Pane */}
        <div className={cn(
          "flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all",
          isFullscreenPreview ? "fixed inset-4 z-[60]" : "relative",
          isFullscreenEditor && "hidden lg:flex"
        )}>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mathematical Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button 
                  onClick={() => setPreviewFontSize(Math.max(8, previewFontSize - 2))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                  title="Decrease Preview Font Size"
                >
                  <Minimize2 size={14} />
                </button>
                <span className="text-[10px] font-bold text-slate-500 min-w-[24px] text-center">{previewFontSize}</span>
                <button 
                  onClick={() => setPreviewFontSize(Math.min(72, previewFontSize + 2))}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                  title="Increase Preview Font Size"
                >
                  <Maximize2 size={14} />
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
          <div className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-full overflow-auto">
              {debouncedCode.trim() ? (
                <div 
                  className="text-slate-900 dark:text-slate-100 transition-all duration-300"
                  style={{ fontSize: `${previewFontSize}px` }}
                >
                  <BlockMath math={debouncedCode} />
                </div>
              ) : (
                <p className="text-slate-400 italic text-sm">Enter LaTeX to see preview...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <SnippetLibrary 
        isOpen={showSnippets}
        onClose={() => setShowSnippets(false)}
        onSelect={(newCode, type) => {
          if (type === 'latex') setCode(newCode);
        }}
        currentCode={code}
        currentType="latex"
      />
    </div>
  );
}
