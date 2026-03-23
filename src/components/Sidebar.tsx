import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Sigma, Menu, X, ChevronRight, Sun, Moon, Plus, History, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: 'html' | 'latex';
  setActiveTab: (tab: 'html' | 'latex') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

/**
 * Sidebar component for application navigation and global settings.
 * Includes engine selection, theme toggling, and project management.
 * 
 * @param {SidebarProps} props - The component props.
 * @returns {JSX.Element} The sidebar navigation layout.
 */
export default function Sidebar({ activeTab, setActiveTab, isDarkMode, setIsDarkMode }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: 'html', label: 'HTML Viewer', icon: Code2, color: 'text-blue-500', description: 'Web development engine' },
    { id: 'latex', label: 'LaTeX Viewer', icon: Sigma, color: 'text-purple-500', description: 'Mathematical rendering' },
  ] as const;

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNewProject = () => {
    if (activeTab === 'html') {
      localStorage.removeItem('polyview_html_code');
    } else {
      localStorage.removeItem('polyview_latex_code');
    }
    window.location.reload();
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">P</div>
          <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">PolyView</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={toggleSidebar}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Logo Section */}
          <div className="hidden lg:flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 dark:shadow-none">P</div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight text-lg">PolyView</h1>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Advanced Engine</p>
            </div>
          </div>

          {/* New Project Button */}
          <button 
            onClick={handleNewProject}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Plus size={20} />
            </div>
            <span className="font-semibold text-sm">New Project</span>
          </button>

          {/* Navigation */}
          <div className="space-y-1 flex-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Engines</p>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  activeTab === tab.id ? "bg-blue-50 dark:bg-blue-900/30" : "bg-transparent"
                )}>
                  <tab.icon size={18} className={cn(
                    "transition-colors",
                    activeTab === tab.id ? tab.color : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className="text-[10px] opacity-60">{tab.description}</p>
                </div>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute right-4 w-1.5 h-1.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            ))}

            <div className="pt-6 space-y-1">
              <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Recent</p>
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50 text-xs transition-all">
                <History size={14} />
                <span>Last session</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto pt-6 space-y-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <span className="text-sm font-semibold">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <Settings size={18} />
              </button>
              <button className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
