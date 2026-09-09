import React, { useState, useEffect } from 'react';
import { fetchRiskQueue, fetchFilters } from '../services/api';
import { WorkRecord, FilterOptions } from '../types';
import { RiskBadge } from '../components/cards/RiskBadge';
import { Search, ChevronLeft, ChevronRight, Eye, ShieldAlert, PieChart, Building2, Copy, CheckSquare, Clock, ArrowUpDown, Sparkles } from 'lucide-react';

interface RiskMonitorPageProps {
  initialSeverity?: string;
  initialDimension?: string;
  onSelectWork: (workId: string) => void;
}

export const RiskMonitorPage: React.FC<RiskMonitorPageProps> = ({
  initialSeverity,
  initialDimension = 'all',
  onSelectWork,
}) => {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const [dimension, setDimension] = useState<string>(initialDimension);
  const [state, setState] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<string>(initialSeverity || '');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('composite_risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);

  const handleColumnSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    fetchFilters().then(setFilterOpts).catch(console.error);
  }, []);

  const loadQueue = () => {
    setLoading(true);
    let minFin: number | undefined;
    let minVen: number | undefined;
    let minComp: number | undefined;
    let effectiveSort = sortBy;

    if (dimension === 'financial') {
      minFin = 35;
      if (sortBy === 'composite_risk_score') effectiveSort = 'financial_risk_score';
    } else if (dimension === 'vendor') {
      minVen = 35;
      if (sortBy === 'composite_risk_score') effectiveSort = 'vendor_risk_score';
    } else if (dimension === 'compliance') {
      minComp = 20;
      if (sortBy === 'composite_risk_score') effectiveSort = 'compliance_risk_score';
    } else if (dimension === 'schedule') {
      if (sortBy === 'composite_risk_score') effectiveSort = 'schedule_risk_score';
    } else if (dimension === 'duplicate') {
      if (sortBy === 'composite_risk_score') effectiveSort = 'duplicate_risk_score';
    }

    fetchRiskQueue({
      state,
      category,
      severity,
      search,
      min_financial_risk: minFin,
      min_vendor_risk: minVen,
      min_compliance_risk: minComp,
      sort_by: effectiveSort,
      page,
      limit: 25,
    })
      .then((res) => {
        setRecords(res.records || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
  }, [state, category, severity, page, dimension, sortBy]);

  const dimensionTabs = [
    { id: 'all', label: 'All Signals', icon: ShieldAlert },
    { id: 'financial', label: 'Financial Anomalies', icon: PieChart },
    { id: 'vendor', label: 'Vendor Risks', icon: Building2 },
    { id: 'duplicate', label: 'Candidate Duplicates', icon: Copy },
    { id: 'compliance', label: 'Compliance Gaps', icon: CheckSquare },
    { id: 'schedule', label: 'Schedule Delays', icon: Clock },
  ];

  const sortedRecords = React.useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal: any = a[sortBy as keyof typeof a];
      let bVal: any = b[sortBy as keyof typeof b];
      if (sortBy === 'state') { aVal = a.State; bVal = b.State; }
      if (aVal === undefined || aVal === null) aVal = 0;
      if (bVal === undefined || bVal === null) bVal = 0;
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });
  }, [records, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Risk Dimension Selector Banner */}
      <div className="card-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Risk Intelligence Audit Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Multi-dimensional risk classification across 79,068 works with ML score prioritization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Total Records: <strong className="text-slate-100 font-mono">{total.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Dimension Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none">
        {dimensionTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = dimension === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setDimension(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-100 text-slate-900 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Control Bar */}
      <div className="card-panel p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Work ID, Title, or Agency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-100 font-medium placeholder-slate-500"
            />
          </div>
        </div>

        {/* State Filter */}
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold max-w-[180px] focus:outline-none focus:ring-2 focus:ring-slate-100"
        >
          <option value="">All States / UTs</option>
          {filterOpts?.states.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold max-w-[160px] focus:outline-none focus:ring-2 focus:ring-slate-100"
        >
          <option value="">All Categories</option>
          {filterOpts?.categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setState('');
            setCategory('');
            setSeverity('');
            setSearch('');
            setDimension('all');
            setSortBy('composite_risk_score');
            setSortOrder('desc');
            setPage(1);
          }}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-extrabold transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Audit Queue Table */}
      <div className="card-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">Loading Risk Audit Queue...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">No works matching selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs select-none">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('work_id')}>
                    <span className="flex items-center gap-1">
                      Work ID <ArrowUpDown className={`w-3 h-3 ${sortBy === 'work_id' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('state')}>
                    <span className="flex items-center gap-1">
                      State & Constituency <ArrowUpDown className={`w-3 h-3 ${sortBy === 'state' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('work_category')}>
                    <span className="flex items-center gap-1">
                      Category <ArrowUpDown className={`w-3 h-3 ${sortBy === 'work_category' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('sanction_amount')}>
                    <span className="flex items-center justify-end gap-1">
                      Sanction Budget <ArrowUpDown className={`w-3 h-3 ${sortBy === 'sanction_amount' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('financial_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Financial <ArrowUpDown className={`w-3 h-3 ${sortBy === 'financial_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('vendor_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Vendor <ArrowUpDown className={`w-3 h-3 ${sortBy === 'vendor_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('duplicate_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Duplicate <ArrowUpDown className={`w-3 h-3 ${sortBy === 'duplicate_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('compliance_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Compliance <ArrowUpDown className={`w-3 h-3 ${sortBy === 'compliance_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('schedule_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Schedule <ArrowUpDown className={`w-3 h-3 ${sortBy === 'schedule_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleColumnSort('composite_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Composite Risk <ArrowUpDown className={`w-3 h-3 ${sortBy === 'composite_risk_score' ? 'text-amber-400 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200 font-medium">
                {sortedRecords.map((r) => (
                  <tr key={r.work_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{r.work_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{r.State}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{r.Constituency}</div>
                    </td>
                    <td className="py-3 px-4 truncate max-w-[140px] text-slate-600 dark:text-slate-400 font-medium">{r.work_category}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{(r.sanction_amount / 100000).toFixed(2)} L
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.financial_risk_score.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.vendor_risk_score.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.duplicate_risk_score ? r.duplicate_risk_score.toFixed(1) : '0.0'}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.compliance_risk_score.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.schedule_risk_score.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={r.overall_risk_level} score={r.composite_risk_score} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectWork(r.work_id)}
                        className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 mx-auto transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

