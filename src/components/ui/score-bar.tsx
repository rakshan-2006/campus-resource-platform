import React from "react";

interface ScoreBarProps {
  label: string;
  score: number;
  weight?: string;
  maxScore?: number;
  className?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  weight,
  maxScore = 100,
  className = "",
}) => {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  const getColor = (pct: number) => {
    if (pct >= 85) return "bg-emerald-600";
    if (pct >= 60) return "bg-blue-600";
    if (pct >= 40) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center justify-between mb-1 text-slate-700">
        <span className="font-medium">
          {label} {weight && <span className="text-slate-500 font-normal">({weight})</span>}
        </span>
        <span className="font-mono font-semibold">{score.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
