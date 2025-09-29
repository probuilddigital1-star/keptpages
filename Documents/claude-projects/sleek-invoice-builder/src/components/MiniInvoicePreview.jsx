// Tiny invoice preview card for template/font selection
import React from 'react';
import { getFontFamily } from '../utils/fontLoader';

const MiniInvoicePreview = ({ template = 'Modern', font = 'System', selected = false, onClick }) => {
  const fontFamily = getFontFamily(font);
  
  // Template-specific color schemes
  const templateStyles = {
    'Modern': {
      headerBg: 'bg-blue-600',
      headerText: 'text-white',
      accent: 'text-blue-600',
      tableBg: 'bg-gray-50'
    },
    'Classic': {
      headerBg: 'bg-gray-800',
      headerText: 'text-white',
      accent: 'text-gray-800',
      tableBg: 'bg-gray-100'
    },
    'Minimal': {
      headerBg: 'bg-white border-b-2 border-gray-900',
      headerText: 'text-gray-900',
      accent: 'text-gray-900',
      tableBg: 'bg-white'
    },
    'Corporate': {
      headerBg: 'bg-gradient-to-r from-gray-700 to-gray-900',
      headerText: 'text-white',
      accent: 'text-gray-700',
      tableBg: 'bg-gray-50'
    },
    'Creative': {
      headerBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
      headerText: 'text-white',
      accent: 'text-purple-600',
      tableBg: 'bg-purple-50'
    },
    'Professional': {
      headerBg: 'bg-navy-900',
      headerText: 'text-white',
      accent: 'text-navy-900',
      tableBg: 'bg-blue-50'
    }
  };

  const style = templateStyles[template] || templateStyles['Modern'];

  return (
    <div 
      onClick={onClick}
      className={`
        relative w-full h-48 bg-white rounded-lg overflow-hidden cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${selected 
          ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
          : 'border border-gray-200 hover:border-gray-300'
        }
      `}
      style={{ fontFamily }}
    >
      {/* Tiny Invoice Layout */}
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className={`${style.headerBg} ${style.headerText} p-2`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-white/20 rounded" />
              <div className="text-[8px] font-bold">INVOICE</div>
            </div>
            <div className="text-[6px]">#2025-001</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-2">
          {/* Client Info */}
          <div className="mb-2">
            <div className="h-1 w-12 bg-gray-300 rounded mb-1" />
            <div className="h-1 w-16 bg-gray-200 rounded" />
          </div>

          {/* Table */}
          <div className={`${style.tableBg} rounded p-1`}>
            <div className="space-y-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="h-1 w-8 bg-gray-300 rounded" />
                  <div className="h-1 w-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="mt-2 text-right">
            <div className={`inline-block h-1.5 w-8 ${style.accent.replace('text-', 'bg-')} rounded opacity-70`} />
          </div>
        </div>
      </div>

      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-1 right-1">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Template Name */}
      <div className="absolute bottom-1 left-1 right-1">
        <div className="text-[10px] text-center text-gray-600 font-medium">
          {template}
        </div>
      </div>
    </div>
  );
};

export default MiniInvoicePreview;