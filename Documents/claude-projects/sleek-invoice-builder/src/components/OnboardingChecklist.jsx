import { completeFirstRun } from '../store/uxFlags';

export default function OnboardingChecklist({ onAddBusiness, onCreateSample, onDownloadPdf, onClose }) {
  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">👋 Welcome to Sleek Invoice</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get started in 3 simple steps</p>
        </div>
        <button 
          onClick={() => { completeFirstRun(); onClose?.(); }} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss checklist"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">1</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add your business info</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload logo and company details</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">2</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Create a sample invoice</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">See how it works with demo data</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">3</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Download your first PDF</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Professional invoice ready to send</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={onCreateSample} 
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
        >
          Create Sample Invoice
        </button>
        <button 
          onClick={onAddBusiness} 
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Business Settings
        </button>
        <button 
          onClick={() => { completeFirstRun(); onClose?.(); }} 
          className="ml-auto px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}