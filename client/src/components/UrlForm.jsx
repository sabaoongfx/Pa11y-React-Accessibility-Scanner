import { useState } from 'react';

export default function UrlForm({ onScan, isLoading }) {
  const [url, setUrl] = useState('');
  const [standard, setStandard] = useState('WCAG2AA');

  const handleSubmit = (e) => {
    e.preventDefault();
    let val = url.trim();
    if (!val) return;
    if (!/^https?:\/\//i.test(val)) {
      val = 'https://' + val;
    }
    onScan(val, standard);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
        <select
          value={standard}
          onChange={(e) => setStandard(e.target.value)}
          className="pl-4 pr-3 mr-2 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        >
          <option value="WCAG2A">WCAG 2.0 A</option>
          <option value="WCAG2AA">WCAG 2.0 AA</option>
          <option value="WCAG2AAA">WCAG 2.0 AAA</option>
        </select>
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </span>
          ) : (
            'Scan'
          )}
        </button>
      </div>
    </form>
  );
}
