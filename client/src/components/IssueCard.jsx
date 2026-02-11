const typeStyles = {
  error: 'border-l-red-500 bg-red-50',
  warning: 'border-l-yellow-500 bg-yellow-50',
  notice: 'border-l-blue-500 bg-blue-50',
};

const typeBadge = {
  error: 'bg-red-200 text-red-800',
  warning: 'bg-yellow-200 text-yellow-800',
  notice: 'bg-blue-200 text-blue-800',
};

export default function IssueCard({ issue }) {
  return (
    <div className={`border-l-4 rounded-lg p-4 ${typeStyles[issue.type] || 'bg-gray-50 border-l-gray-400'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-800 font-medium flex-1">{issue.message}</p>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${typeBadge[issue.type] || 'bg-gray-200 text-gray-700'}`}>
          {issue.type}
        </span>
      </div>
      {issue.selector && (
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold">Selector:</span>{' '}
          <code className="bg-white/70 px-1.5 py-0.5 rounded text-gray-700">{issue.selector}</code>
        </p>
      )}
      {issue.context && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View HTML context
          </summary>
          <pre className="mt-1 text-xs bg-white/70 p-2 rounded overflow-x-auto text-gray-700">
            {issue.context}
          </pre>
        </details>
      )}
      <p className="text-xs text-gray-400 mt-2">{issue.code}</p>
    </div>
  );
}
