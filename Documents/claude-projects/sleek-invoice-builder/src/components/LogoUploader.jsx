import { useState, useEffect } from 'react';
import useSettings from '../hooks/useSettings';
import { canUse } from '../store/subscription';
import authService from '../services/authService';

export default function LogoUploader({ onNeedUpgrade }) {
  const { logoDataUrl, setLogo } = useSettings();
  const [logo, setLogoState] = useState(logoDataUrl);
  // Use authService directly for most accurate check
  const isPremium = authService.canUseLogo() || canUse('logo');
  
  // Sync local state with context
  useEffect(() => {
    setLogoState(logoDataUrl);
  }, [logoDataUrl]);

  if (!isPremium) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 text-center bg-gray-50 dark:bg-gray-800/50">
        <div className="mb-3">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto grid place-items-center">
            <span className="text-2xl">🔒</span>
          </div>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Logo Upload is Premium</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add your brand logo to invoices with a Premium subscription.
        </p>
        <button 
          onClick={onNeedUpgrade} 
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          Upgrade to Unlock
        </button>
      </div>
    );
  }

  const onFile = async (file) => {
    if (!file) return;
    const dataUrl = await readAndScale(file, 512);
    setLogoState(dataUrl);
    setLogo(dataUrl); // emits settings-updated event
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 grid place-items-center overflow-hidden">
          {logo ? (
            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">No logo</span>
          )}
        </div>
        <label className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => onFile(e.target.files?.[0])} 
          />
          Upload logo
        </label>
        {logo && (
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => { 
              setLogoState(''); 
              setLogo(''); // emits settings-updated event
            }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        PNG or JPG, will be resized to about 512px wide for crisp PDFs.
      </p>
    </div>
  );
}

// Helper function to read and scale image
function readAndScale(file, maxW) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}