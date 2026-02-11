import { useState } from 'react';
import IssueCard from './IssueCard';

export default function IssueList({ issues }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const counts = issues.reduce(
    (acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; },
    { error: 0, warning: 0, notice: 0 }
  );

  const filters = [
    { label: 'All', value: 'all', count: issues.length, color: 'indigo' },
    { label: 'Errors', value: 'error', count: counts.error || 0, color: 'red' },
    { label: 'Warnings', value: 'warning', count: counts.warning || 0, color: 'yellow' },
    { label: 'Notices', value: 'notice', count: counts.notice || 0, color: 'blue' },
  ];

  const colorMap = {
    indigo: { active: 'bg-indigo-600 text-white ring-indigo-300', inactive: 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
    red:    { active: 'bg-red-600 text-white ring-red-300',       inactive: 'bg-white text-red-700 border-red-200 hover:bg-red-50',       badge: 'bg-red-100 text-red-700' },
    yellow: { active: 'bg-yellow-500 text-white ring-yellow-300', inactive: 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' },
    blue:   { active: 'bg-blue-600 text-white ring-blue-300',     inactive: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50',     badge: 'bg-blue-100 text-blue-700' },
  };

  const filtered = activeFilter === 'all'
    ? issues
    : issues.filter((i) => i.type === activeFilter);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Issues</h2>

      {/* Filter tabs - full width, large and visible */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {filters.map(({ label, value, count, color }) => {
          const isActive = activeFilter === value;
          const styles = colorMap[color];
          return (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition ${
                isActive
                  ? `${styles.active} ring-2 border-transparent`
                  : styles.inactive
              }`}
            >
              {label}
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : styles.badge
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          {issues.length === 0
            ? 'No accessibility issues found — great job!'
            : 'No issues match the selected filter.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
