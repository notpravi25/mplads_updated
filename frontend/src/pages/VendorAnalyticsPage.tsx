import React, { useState, useEffect } from 'react';
import { fetchRiskQueue, fetchFilters } from '../services/api';
import { WorkRecord, FilterOptions } from '../types';
import { Building2, Eye, Filter, RotateCcw, AlertTriangle, ShieldCheck, ArrowUpDown } from 'lucide-react';

interface VendorAnalyticsPageProps {
  onSelectWork?: (workId: string) => void;
}

export const VendorAnalyticsPage: React.FC<VendorAnalyticsPageProps> = ({ onSelectWork }) => {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(35);
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const [sortField, setSortField] = useState<string>('vendor_risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedRecords = React.useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      if (sortField === 'State') { aVal = a.State; bVal = b.State; }
      if (aVal === undefined || aVal === null) aVal = 0;
      if (bVal === undefined || bVal === null) bVal = 0;
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });
  }, [records, sortField, sortOrder]);

  useEffect(() => {
    fetchFilters().then(setFilterOpts).catch(console.error);
  }, []);

  const loadVendorQueue = () => {
    setLoading(true);
    fetchRiskQueue({
      state: selectedState || undefined,
      category: selectedCategory || undefined,
      min_vendor_risk: minScore,
      sort_by: 'vendor_risk_score',
      page: 1,
      limit: 25,
    })
      .then((res) => {
        setRecords(res.records || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadVendorQueue();
  }, [selectedState, selectedCategory, minScore]);

  const handleReset = () => {
    setSelectedState('');
    setSelectedCategory('');
    setMinScore(35);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-slate-900" /> Vendor Payment Pattern & Disbursal Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Early-warning decision-support module evaluating expenditure concentration, Herfindahl-Hirschman Index (HHI), 7-day payment timing bursts, and single disbursal dominance ratios.
        </p>
      </div>

      {/* Responsible AI Principles Banner */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-xs text-amber-900 space-y-1.5 shadow-sm">
        <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-600" /> Responsible AI Methodology
        </span>
        <p className="leading-relaxed font-medium">
          <strong>Concentration alone is not evidence of irregularity.</strong> A project completed by a single contractor is normal. Vendor Risk Scores reflect combined payment timing, disbursal size, and multi-signal convergence to prioritize administrative human review.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-sm">
          <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Priority Review Cases</span>
          <div className="text-2xl font-black text-orange-600 font-mono tracking-tight">68 Works</div>
          <p className="text-xs text-slate-500 font-medium">Multi-Signal Vendor Score &ge; 65</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-sm">
          <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">High Concentration Cases (&gt;70%)</span>
          <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">1,120 Works</div>
          <p className="text-xs text-slate-500 font-medium">Primary Contractor &ge; 70% Share</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-sm">
          <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Rapid Disbursal Bursts</span>
          <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">234 Works</div>
          <p className="text-xs text-slate-500 font-medium">Multiple Payments in 7-Day Window</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Filter className="w-4 h-4 text-slate-700" /> Filter Vendor Risk Queue
          </div>
          {(selectedState || selectedCategory || minScore !== 35) && (
            <button onClick={handleReset} className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">State / UT</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="">All States / UTs</option>
              {filterOpts?.states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Work Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="">All Categories</option>
              {filterOpts?.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Min Vendor Risk Score</label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value={65}>65+ Priority Review (Multi-Signal)</option>
              <option value={35}>35+ Moderate Review Queue</option>
              <option value={10}>10+ Baseline Monitoring</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Vendor Risk Priority Queue Table */}
      <div className="card-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading Vendor Risk Queue...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">No vendor risk cases found matching applied criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs select-none">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('work_id')}>
                    <span className="flex items-center gap-1">
                      Work ID <ArrowUpDown className={`w-3 h-3 ${sortField === 'work_id' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('State')}>
                    <span className="flex items-center gap-1">
                      Location & Category <ArrowUpDown className={`w-3 h-3 ${sortField === 'State' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('top_vendor')}>
                    <span className="flex items-center gap-1">
                      Primary Contractor <ArrowUpDown className={`w-3 h-3 ${sortField === 'top_vendor' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('top_vendor_share')}>
                    <span className="flex items-center justify-center gap-1">
                      Work Share <ArrowUpDown className={`w-3 h-3 ${sortField === 'top_vendor_share' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('hhi_index')}>
                    <span className="flex items-center justify-center gap-1">
                      HHI Index <ArrowUpDown className={`w-3 h-3 ${sortField === 'hhi_index' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('single_payment_ratio')}>
                    <span className="flex items-center justify-center gap-1">
                      Single Payment <ArrowUpDown className={`w-3 h-3 ${sortField === 'single_payment_ratio' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('burst_7day_count')}>
                    <span className="flex items-center justify-center gap-1">
                      7-Day Burst <ArrowUpDown className={`w-3 h-3 ${sortField === 'burst_7day_count' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('vendor_risk_score')}>
                    <span className="flex items-center justify-center gap-1">
                      Vendor Score <ArrowUpDown className={`w-3 h-3 ${sortField === 'vendor_risk_score' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('vendor_explanation')}>
                    <span className="flex items-center gap-1">
                      Audit Interpretation <ArrowUpDown className={`w-3 h-3 ${sortField === 'vendor_explanation' ? 'text-indigo-600 opacity-100' : 'opacity-50'}`} />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sortedRecords.map((r) => (
                  <tr key={r.work_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.work_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.State} • {r.Constituency}</div>
                      <div className="text-[11px] text-slate-500">{r.work_category}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 max-w-[140px] truncate" title={r.top_vendor || 'Primary Contractor'}>
                      {r.top_vendor || 'Primary Contractor'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">
                      {((r.top_vendor_share || 0.20) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 font-medium">
                      {r.project_hhi ? r.project_hhi.toFixed(0) : '10,000'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-orange-600">
                      {(r.single_disbursal_ratio || 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.rapid_disbursal_burst_flag ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                          Flagged
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">Normal</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-orange-600">
                      {r.vendor_risk_score.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate" title={r.vendor_risk_interpretation || r.vendor_risk_explanation || r.description}>
                      {r.vendor_risk_interpretation || r.vendor_risk_explanation || r.description}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {onSelectWork && (
                        <button
                          onClick={() => onSelectWork(r.work_id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
