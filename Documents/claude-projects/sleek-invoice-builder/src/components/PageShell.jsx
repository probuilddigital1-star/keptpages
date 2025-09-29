import ThemeToggle from './ThemeToggle';
import SleekLogo from './SleekLogo';

export default function PageShell({ title, actions, children, onLogoClick }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <SleekLogo onClick={onLogoClick} showText={true} size="default" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {actions}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 md:pb-8">
        {title ? <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">{title}</h1> : null}
        {children}
      </main>
    </div>
  );
}