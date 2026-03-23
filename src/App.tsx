/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import HTMLViewer from './components/HTMLViewer';
import LaTeXViewer from './components/LaTeXViewer';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Main application component for PolyView.
 * Manages the active engine tab (HTML or LaTeX) and global theme state.
 * 
 * @returns {JSX.Element} The root application layout.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<'html' | 'latex'>(() => {
    return (localStorage.getItem('polyview_active_tab') as 'html' | 'latex') || 'html';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('polyview_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('polyview_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('polyview_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('polyview_theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'html' ? (
                <ErrorBoundary name="HTML Engine">
                  <HTMLViewer />
                </ErrorBoundary>
              ) : (
                <ErrorBoundary name="LaTeX Engine">
                  <LaTeXViewer />
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs flex justify-between items-center transition-colors">
          <p>© 2026 PolyView Engine. Professional Grade.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">v1.2.0</span>
            <span className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">Privacy</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
