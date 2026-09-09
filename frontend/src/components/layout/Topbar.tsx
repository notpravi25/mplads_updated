import React from 'react';
import { Search, Settings, Sparkles } from 'lucide-react';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: () => void;
  onOpenChat: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onOpenChat,
}) => {
  return (
    <header className="h-16 bg-[#0f172a]/95 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-md transition-colors">
      {/* Search Input Bar Pill */}
      <div className="flex-1 max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }} className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Quick search (Work ID, District, MP, Vendor...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:bg-slate-800 focus:ring-2 focus:ring-slate-100 transition-all"
          />
        </form>
      </div>

      {/* Header Right Action Items */}
      <div className="flex items-center gap-3">
        {/* AI Risk Assistant Button */}
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-xl text-xs font-extrabold shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>AI Assistant</span>
        </button>

        {/* Settings Gear Icon Pill */}
        <button className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-colors shadow-2xs">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};


