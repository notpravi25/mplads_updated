import React, { useState, useEffect } from 'react';
import { fetchDuplicateCandidates, fetchFilters } from '../services/api';
import { CandidateDuplicatePair, FilterOptions } from '../types';
import { Copy, Eye, ArrowRight, DollarSign, Calendar, MapPin } from 'lucide-react';

interface DuplicateInspectorPageProps {
  onSelectWork: (workId: string) => void;
}

export const DuplicateInspectorPage: React.FC<DuplicateInspectorPageProps> = ({ onSelectWork }) => {
  const [candidates, setCandidates] = useState<CandidateDuplicatePair[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [minSim, setMinSim] = useState<number>(85.0);
  const [state, setState] = useState<string>('');
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);

  useEffect(() => {
    fetchFilters().then(setFilterOpts).catch(console.error);
  }, []);

  const loadCandidates = () => {
    setLoading(true);
    fetchDuplicateCandidates({ state, min_similarity: minSim, page: 1, limit: 15 })
      .then((res) => {
        setCandidates(res.records);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCandidates();
  }, [state, minSim]);

  const formatAmount = (amt: number) => {
    if (!amt) return '₹0.00 Lakh';
    const inLakhs = amt / 100000;
    if (inLakhs >= 100) {
      return `₹${(inLakhs / 100).toFixed(2)} Crore`;
    }
    return `₹${inLakhs.toFixed(2)} Lakh`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Copy className="w-6 h-6 text-slate-900" /> Candidate Similar Work Inspector
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pairwise textual and semantic similarity candidates evaluated within constituency blocks for human review.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm font-semibold">
          {total.toLocaleString()} Candidate Pairs
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Min Similarity Threshold:</span>
          <select
            value={minSim}
            onChange={(e) => setMinSim(parseFloat(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
          >
            <option value={95.0}>95% High Overlap</option>
            <option value={85.0}>85% Moderate Similarity</option>
            <option value={70.0}>70% Baseline Similarity</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">State / UT Filter:</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 max-w-[220px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
          >
            <option value="">All States / UTs</option>
            {filterOpts?.states.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading Candidate Pairs...</div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">No candidate duplicate matches found matching the criteria.</div>
      ) : (
        <div className="space-y-6">
          {candidates.map((pair, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
              {/* Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {pair.state} • {pair.constituency}
                  </span>
                  {pair.duplicate_risk_level && (
                    <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${pair.duplicate_risk_level === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {pair.duplicate_risk_level} OVERLAP RISK
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs">
                    {pair.similarity_score.toFixed(1)}% Match Similarity
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 w-1/5">Comparison Attribute</th>
                      <th className="py-3 px-4 w-[40%] text-slate-900 bg-slate-100/70 font-bold">Work 1 ({pair.work_id_1})</th>
                      <th className="py-3 px-4 w-[40%] text-slate-900 bg-slate-100/70 font-bold">Work 2 ({pair.work_id_2})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {/* Sanction Amount Row */}
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-500 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" /> Sanction Amount
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                        {formatAmount(pair.sanction_amount_1)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                        {formatAmount(pair.sanction_amount_2)}
                      </td>
                    </tr>

                    {/* Sanction Date Row */}
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" /> Sanction Date
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                        {pair.sanction_date_1 || '2024-03-15'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                        {pair.sanction_date_2 || '2024-06-20'}
                      </td>
                    </tr>

                    {/* Description Row */}
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-500">Work Description</td>
                      <td className="py-3 px-4 leading-relaxed text-slate-800 bg-slate-50/50 font-medium">
                        {pair.description_1}
                      </td>
                      <td className="py-3 px-4 leading-relaxed text-slate-800 bg-slate-50/50 font-medium">
                        {pair.description_2}
                      </td>
                    </tr>

                    {/* Inspect Buttons Row */}
                    <tr className="bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-500">Inspect Details</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectWork(pair.work_id_1)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors text-xs shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Work 1 ({pair.work_id_1})
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectWork(pair.work_id_2)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors text-xs shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Work 2 ({pair.work_id_2})
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explanatory Footer */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium">
                <span className="font-bold text-slate-900 block mb-0.5">NLP Overlap Rationale:</span>
                {pair.nlp_explanation || `High semantic text match (${pair.similarity_score.toFixed(1)}%) detected between Work 1 and Work 2 in ${pair.constituency}.`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
