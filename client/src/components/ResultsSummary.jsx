export default function ResultsSummary({ results }) {
  const counts = results.counts || results.issues.reduce(
    (acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    },
    { error: 0, warning: 0, notice: 0 }
  );

  const title = results.documentTitle || results.pageUrl || results.url;
  const total = (counts.error || 0) + (counts.warning || 0) + (counts.notice || 0);

  const cards = [
    { label: 'Errors', count: counts.error || 0, color: 'bg-red-100 text-red-800 border-red-300' },
    { label: 'Warnings', count: counts.warning || 0, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { label: 'Notices', count: counts.notice || 0, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Results for <span className="text-indigo-600">{title}</span>
        </h2>
        <div className="flex items-center gap-3">
          {results.date && (
            <span className="text-xs text-gray-400">{new Date(results.date).toLocaleString()}</span>
          )}
          <span className="text-sm text-gray-500">{results.standard}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(({ label, count, color }) => (
          <div key={label} className={`rounded-lg border p-4 text-center ${color}`}>
            <div className="text-3xl font-bold">{count}</div>
            <div className="text-sm font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-4">
        {total} total issue{total !== 1 ? 's' : ''} found
      </p>
    </div>
  );
}
