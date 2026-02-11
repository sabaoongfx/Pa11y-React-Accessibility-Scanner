export default function Header() {
  return (
    <header className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
        <img src="/logo.svg" alt="Pa11y logo" className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pa11y Accessibility Checker</h1>
          <p className="text-indigo-200 mt-1 text-sm">
            Scan any website for WCAG accessibility issues
          </p>
        </div>
      </div>
    </header>
  );
}
