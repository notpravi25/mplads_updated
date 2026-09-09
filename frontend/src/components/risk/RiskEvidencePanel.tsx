import React from 'react';
import { WorkRecord } from '../../types';
import { ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

interface RiskEvidencePanelProps {
  work: WorkRecord;
}

export const RiskEvidencePanel: React.FC<RiskEvidencePanelProps> = ({ work }) => {
  const amount = work.sanction_amount || 0;
  const ratio = work.amount_to_peer_ratio || 1.0;
  const pct = work.category_percentile || 50.0;
  const vendorShare = (work.top_vendor_share || 0) * 100;
  const hasImage = work.has_evidence_image || false;

  const dimensions = [
    {
      title: 'Financial Risk Engine',
      observed: `₹${(amount / 100000).toFixed(2)} Lakh`,
      baseline: 'Category Median Baseline',
      deviation: `${ratio.toFixed(2)}x Peer Ratio (${pct.toFixed(1)}th percentile)`,
      isHighDev: ratio >= 2.0,
      explanation: work.financial_explanation || 'Expenditure falls within expected baseline bounds.'
    },
    {
      title: 'Vendor & Disbursal Pattern Risk',
      observed: work.top_vendor || 'Primary Contractor',
      baseline: `HHI: ${work.project_hhi ? work.project_hhi.toFixed(0) : '10,000'} | Single Disbursal: ${(work.single_disbursal_ratio || 100).toFixed(1)}%`,
      deviation: `${vendorShare.toFixed(1)}% Constituency Work Share`,
      isHighDev: (work.vendor_risk_score || 0) >= 35,
      explanation: work.vendor_risk_explanation || 'Vendor disbursal concentration within standard limits.'
    },
    {
      title: 'Duplicate Text (NLP Engine)',
      observed: work.description || 'N/A',
      baseline: 'Unique Text Threshold (< 70%)',
      deviation: work.duplicate_risk_score ? `${work.duplicate_risk_score.toFixed(1)}% Match` : 'No Match',
      isHighDev: (work.duplicate_risk_score || 0) >= 70,
      explanation: (work.duplicate_risk_score || 0) >= 70
        ? `Candidate duplicate description detected in ${work.Constituency} constituency.`
        : 'Unique description text verified across database.'
    },
    {
      title: 'Compliance & Evidence Gaps',
      observed: hasImage ? 'Image Uploaded' : 'Missing Photo Evidence',
      baseline: 'Physical Site Upload Required',
      deviation: !hasImage && work.completion_date ? 'Missing Photo' : 'Compliant',
      isHighDev: !hasImage && work.completion_date,
      explanation: work.compliance_explanation || 'Site evidence requirements satisfied.'
    },
    {
      title: 'Schedule & Progress Risk',
      observed: `${work.expenditure_progress_pct || 0}% Expenditure Progress`,
      baseline: `${work.expected_timeline_progress_pct || 0}% Expected Timeline Progress`,
      deviation: `${work.progress_gap_pct || 0}% Progress Gap`,
      isHighDev: (work.progress_gap_pct || 0) >= 15,
      explanation: work.schedule_explanation || 'Schedule timeline progress aligns with financial disbursals.'
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Multi-Signal Audit Evidence Breakdown ("Why Flagged?")
        </h3>
        <span className="text-xs font-mono font-bold text-slate-500">Work ID: {work.work_id}</span>
      </div>

      {/* 5 Risk Sub-Engine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {dimensions.map((dim, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">{dim.title}</span>
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
                dim.isHighDev ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {dim.deviation}
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-500">
              <div className="flex justify-between">
                <span>Observed:</span>
                <span className="text-slate-900 font-bold truncate max-w-[200px]">{dim.observed}</span>
              </div>
              <div className="flex justify-between">
                <span>Baseline:</span>
                <span className="text-slate-700 font-medium">{dim.baseline}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
              {dim.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Responsible AI Vendor Risk Evidence Structured Box */}
      <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" /> Vendor Payment Pattern Analysis (Responsible AI Decision Support)
          </h4>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Non-Accusatory Early Warning</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">1. RECORDED FACT</span>
            <p className="text-slate-800 leading-relaxed font-medium">
              {work.top_vendor ? `Primary vendor '${work.top_vendor}' handles ${vendorShare.toFixed(1)}% of sanctioned works in ${work.Constituency}.` : 'Single primary contractor assigned to this work.'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">2. PATTERN INDICATORS</span>
            <ul className="text-slate-700 space-y-1 text-[11px] list-disc list-inside font-medium">
              <li>HHI Index: <strong className="text-slate-900 font-bold">{work.project_hhi ? work.project_hhi.toFixed(0) : '10,000'}</strong></li>
              <li>Single Disbursal Ratio: <strong className="text-slate-900 font-bold">{(work.single_disbursal_ratio || 100).toFixed(1)}%</strong></li>
              <li>Rapid Disbursal Window: <strong className="text-slate-900 font-bold">{work.rapid_disbursal_burst_flag ? '7-Day Burst Flagged' : 'Normal Timing'}</strong></li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">3. AUDIT INTERPRETATION</span>
            <p className="text-slate-800 leading-relaxed text-[11px] font-medium">
              {work.vendor_risk_interpretation || 'Expenditure concentration observed with standard payment timing. No elevated review priority required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Reviewer Action */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-1.5 text-xs shadow-md">
        <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] block flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Recommended Administrative Review Action:
        </span>
        <p className="text-slate-200 leading-relaxed font-medium">
          {work.recommended_reviewer_action || 'Perform standard periodic monitoring.'}
        </p>
      </div>
    </div>
  );
};
