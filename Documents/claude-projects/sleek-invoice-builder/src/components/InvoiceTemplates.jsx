import React from 'react';
// Using working icons from react-icons
import { FiMonitor, FiActivity, FiHome, FiBriefcase } from 'react-icons/fi';
import { FaBalanceScale, FaPalette } from 'react-icons/fa';
import { getBrandLogoUrl } from '../utils/branding.js';

/**
 * Premium Invoice Templates Component
 * Provides industry-specific professional templates for Pro users
 * Each template has unique styling and layout optimized for different businesses
 */

const InvoiceTemplates = {
  // Modern Minimal - Professional Enterprise Design
  modern: {
    id: 'modern',
    name: 'Modern Professional',
    icon: <FiMonitor className="w-5 h-5" style={{ color: '#2563eb' }} />,
    category: 'Business Standard',
    isPremium: false, // Free template
    color: '#2563EB',
    description: 'Clean, professional design for any business',
    render: (invoice, isPremium) => (
      <div className="relative bg-white overflow-hidden" style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        borderRadius: '12px'
      }}>
        {/* Ultra Premium Executive Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-purple-600/20"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="relative px-12 py-10">
          <div className="relative flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>INVOICE</h1>
                  <p className="text-blue-300 text-sm font-medium tracking-wider">#{String(invoice.id).padStart(6, '0')}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-6 py-4 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
                <div className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-1">{invoice.business_name || 'Your Business'}</div>
                <p className="text-blue-200 text-sm font-medium tracking-wide">{invoice.business_tagline || 'Professional Services'}</p>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <p className="text-blue-200 text-xs">{invoice.business_email || 'contact@business.com'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Status Bar */}
        <div className="px-12 py-4 border-b" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg mt-1">
                  <span className="w-2.5 h-2.5 bg-white rounded-full mr-2 animate-pulse shadow-sm"></span>
                  ACTIVE
                </span>
              </div>
              <div className="border-l border-gray-300 pl-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue Date</p>
                <p className="text-gray-900 font-medium">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="border-l border-gray-300 pl-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</p>
                <p className="text-gray-900 font-medium">{invoice.due_date || 'Upon Receipt'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Total Amount Due</p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="px-12 py-8" style={{ backgroundColor: 'white' }}>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">CLIENT DETAILS</h3>
              </div>
              <div className="space-y-3 relative z-10">
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{invoice.client_name}</p>
                <p className="text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {invoice.client_email}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xs font-black text-white/90 uppercase tracking-widest">PAYMENT TERMS</h3>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-sm text-white/80 font-medium">Method:</span>
                  <span className="text-sm font-bold text-white">Wire Transfer / ACH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80 font-medium">Terms:</span>
                  <span className="text-sm font-bold text-white">NET 30</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-12 pb-10">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                  <th className="text-left py-5 px-8 text-xs font-black text-white uppercase tracking-widest">Professional Services</th>
                  <th className="text-center py-5 px-6 text-xs font-black text-white uppercase tracking-widest">QTY</th>
                  <th className="text-right py-5 px-6 text-xs font-black text-white uppercase tracking-widest">Rate</th>
                  <th className="text-right py-5 px-8 text-xs font-black text-white uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-sm font-bold text-white">{idx + 1}</span>
                        </div>
                        <div>
                          <span className="text-gray-900 font-semibold text-base">{item.description}</span>
                          <p className="text-xs text-gray-500 mt-0.5">Premium Service</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-6 px-6 text-gray-700 font-bold text-base">{item.quantity}</td>
                    <td className="text-right py-6 px-6 text-gray-700 font-semibold text-base">${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-6 px-8 font-black text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      ${(item.quantity * item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Section */}
        <div className="px-12 pb-12">
          <div className="flex justify-end">
            <div className="w-[450px]">
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20"></div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between text-white/80 py-2">
                    <span className="font-semibold text-sm uppercase tracking-wide">Subtotal</span>
                    <span className="font-bold text-white text-lg">${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-white/80 py-2">
                    <span className="font-semibold text-sm uppercase tracking-wide">Premium Tax</span>
                    <span className="font-bold text-white text-lg">$0.00</span>
                  </div>
                  <div className="flex justify-between text-white/80 py-2">
                    <span className="font-semibold text-sm uppercase tracking-wide">Enterprise Discount</span>
                    <span className="font-bold text-white text-lg">-$0.00</span>
                  </div>
                  <div className="pt-4 border-t-2 border-white/30">
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-black text-white/90 uppercase tracking-wide">Total Amount</span>
                      <div className="text-right">
                        <p className="text-4xl font-black text-white drop-shadow-lg">
                          ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-white/60 mt-1 uppercase tracking-widest">USD Currency</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-6" style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-base font-bold mb-2 tracking-wide">Thank You For Your Business</p>
              <p className="text-sm text-blue-200/80">Support: {invoice.business_email || 'support@business.com'}</p>
              <p className="text-sm text-blue-200/80 mt-1">Phone: {invoice.business_phone || '+1 (888) BUSINESS'}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <p className="text-xs text-blue-200/90 font-medium">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-xs text-white font-bold mt-1">Sleek Invoice Professional Suite</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Traditional - Classic black and white, conservative
  traditional: {
    id: 'traditional',
    name: 'Traditional Classic',
    icon: <FaBalanceScale className="w-5 h-5" style={{ color: '#374151' }} />,
    category: 'Conservative Business',
    isPremium: true,
    color: '#374151',
    description: 'Timeless black & white design with serif fonts',
    render: (invoice, isPremium) => (
      <div className="bg-white shadow-lg" style={{ fontFamily: 'Georgia, Times New Roman, serif', border: '2px solid #000', padding: '0' }}>
        {/* Traditional Header - Pure Black and White with Classic Design */}
        <div style={{ backgroundColor: '#000', color: '#fff', padding: '30px', textAlign: 'center' }}>
          {(() => {
            const logoUrl = getBrandLogoUrl({ plan: isPremium ? 'pro' : 'free', orgLogoUrl: invoice.logo_url });
            return logoUrl ? (
              <img src={logoUrl} alt="" style={{ maxHeight: '40px', margin: '0 auto 16px', filter: 'brightness(0) invert(1)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : null;
          })()}
          <h1 style={{ fontSize: '42px', fontFamily: 'Georgia, serif', fontWeight: '700', letterSpacing: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
            INVOICE
          </h1>
          <div style={{ width: '100px', height: '3px', backgroundColor: '#fff', margin: '12px auto' }}></div>
          <div style={{ fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: '400', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>
            {invoice.business_name || 'TRADITIONAL CO.'}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>
            {invoice.business_email || 'accounting@traditional.com'} | TEL: {invoice.business_phone || '(555) 100-0000'}
          </div>
        </div>

        {/* Invoice Details - Traditional Style with Classic Layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 30px', borderBottom: '2px solid #000', backgroundColor: '#f5f5f5' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', fontFamily: 'Courier New, monospace' }}>
              INVOICE NUMBER
            </p>
            <p style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: '600' }}>
              #{String(invoice.id).padStart(8, '0')}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', fontFamily: 'Courier New, monospace' }}>
              DATE OF ISSUE
            </p>
            <p style={{ fontSize: '18px', fontFamily: 'Georgia, serif' }}>
              {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', fontFamily: 'Courier New, monospace' }}>
              PAYMENT TERMS
            </p>
            <p style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: '600' }}>
              {invoice.due_date || 'NET 30'}
            </p>
          </div>
        </div>

        {/* Bill To Section - Traditional with Classic Formatting */}
        <div style={{ padding: '25px 30px', borderBottom: '1px solid #000' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#000', color: '#fff', padding: '4px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '2px', marginBottom: '12px', fontFamily: 'Courier New, monospace' }}>
            BILL TO
          </div>
          <div style={{ paddingLeft: '20px' }}>
            <p style={{ fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: '700', marginBottom: '4px', color: '#000' }}>{invoice.client_name}</p>
            <p style={{ fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#333' }}>{invoice.client_email}</p>
          </div>
        </div>

        {/* Items Table - Traditional Black & White with Classic Grid */}
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000', color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '15px 30px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'Courier New, monospace', borderRight: '1px solid #fff' }}>
                DESCRIPTION OF SERVICES
              </th>
              <th style={{ textAlign: 'center', padding: '15px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'Courier New, monospace', borderRight: '1px solid #fff' }}>
                QTY
              </th>
              <th style={{ textAlign: 'right', padding: '15px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'Courier New, monospace', borderRight: '1px solid #fff' }}>
                RATE
              </th>
              <th style={{ textAlign: 'right', padding: '15px 30px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'Courier New, monospace' }}>
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '20px 30px', fontSize: '14px', fontFamily: 'Georgia, serif', borderRight: '1px solid #ddd' }}>{item.description}</td>
                <td style={{ textAlign: 'center', padding: '20px 15px', fontSize: '14px', fontFamily: 'Courier New, monospace', fontWeight: '600', borderRight: '1px solid #ddd' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '20px 15px', fontSize: '14px', fontFamily: 'Courier New, monospace', borderRight: '1px solid #ddd' }}>
                  ${parseFloat(item.price).toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', padding: '20px 30px', fontSize: '16px', fontWeight: '700', fontFamily: 'Georgia, serif' }}>
                  ${(item.quantity * parseFloat(item.price)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Section - Traditional with Classic Accounting Style */}
        <div style={{ padding: '30px' }}>
          <div className="flex justify-end">
            <div style={{ width: '350px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tr>
                  <td style={{ padding: '8px 0', fontSize: '14px', fontFamily: 'Georgia, serif' }}>SUBTOTAL:</td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '14px', fontFamily: 'Courier New, monospace' }}>${invoice.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontSize: '14px', fontFamily: 'Georgia, serif' }}>TAX (0%):</td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '14px', fontFamily: 'Courier New, monospace' }}>$0.00</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontSize: '14px', fontFamily: 'Georgia, serif' }}>DISCOUNT:</td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '14px', fontFamily: 'Courier New, monospace' }}>$0.00</td>
                </tr>
                <tr style={{ borderTop: '3px double #000' }}>
                  <td style={{ padding: '12px 0', fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: '700' }}>TOTAL DUE:</td>
                  <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '24px', fontWeight: '700', fontFamily: 'Georgia, serif' }}>
                    ${invoice.total.toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        {/* Footer - Traditional with Classic Legal Style */}
        <div style={{ backgroundColor: '#000', color: '#fff', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontFamily: 'Courier New, monospace', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
            PAYMENT IS DUE WITHIN THIRTY (30) DAYS FROM DATE OF INVOICE
          </p>
          <p style={{ fontSize: '10px', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            Thank you for your continued business and prompt payment
          </p>
        </div>
      </div>
    ),
  },

  // Creative Gradient - Design agencies, photographers, artists
  creative: {
    id: 'creative',
    name: 'Creative Studio',
    icon: <FaPalette className="w-5 h-5" style={{ color: '#ec4899' }} />,
    category: 'Design & Creative',
    isPremium: true,
    color: '#ec4899',
    description: 'Vibrant gradients and modern sans-serif for creatives',
    render: (invoice, isPremium) => (
      <div className="relative bg-white shadow-2xl overflow-hidden" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', borderRadius: '24px' }}>
        {/* Gradient Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" 
             style={{ background: 'radial-gradient(circle, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)', transform: 'translate(30%, -30%)' }}></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20" 
             style={{ background: 'radial-gradient(circle, #fbbf24 0%, #f97316 50%, #ef4444 100%)', transform: 'translate(-30%, 30%)' }}></div>
        
        {/* Creative Header with Vibrant Gradients */}
        <div className="relative z-10 p-8">
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)', 
                        padding: '32px', borderRadius: '16px', marginBottom: '24px' }}>
            <div className="flex justify-between items-start">
              <div>
                <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', letterSpacing: '-2px', marginBottom: '8px' }}>
                  INVOICE
                </h1>
                <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '24px' }}>
                  <p style={{ color: 'white', fontWeight: '600', fontSize: '18px' }}>#{String(invoice.id).padStart(5, '0')}</p>
                </div>
              </div>
              <div className="text-right">
                {(() => {
                  const logoUrl = getBrandLogoUrl({ plan: isPremium ? 'pro' : 'free', orgLogoUrl: invoice.logo_url });
                  return logoUrl ? (
                    <img src={logoUrl} alt="" style={{ maxHeight: '50px', marginBottom: '12px', filter: 'brightness(0) invert(1)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : null;
                })()}
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
                  {invoice.business_name || 'CREATIVE STUDIO'}
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                  {invoice.business_tagline || 'Where imagination meets innovation'}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                  {invoice.business_email || 'hello@creativestudio.design'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colorful Client Section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
            <h3 className="text-xs font-bold text-purple-600 uppercase mb-2">Client</h3>
            <p className="text-lg font-semibold text-gray-900">{invoice.client_name}</p>
            <p className="text-gray-600">{invoice.client_email}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl text-right">
            <div className="mb-2">
              <p className="text-xs font-bold text-blue-600 uppercase">Project Date</p>
              <p className="text-gray-900">{invoice.date}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-cyan-600 uppercase">Due</p>
              <p className="text-gray-900">On Receipt</p>
            </div>
          </div>
        </div>

        {/* Creative Services Table with Colorful Design */}
        <div className="px-8 mb-8">
          <div style={{ background: 'linear-gradient(90deg, #f472b6 0%, #a78bfa 100%)', padding: '16px 24px', borderRadius: '16px 16px 0 0' }}>
            <div className="grid grid-cols-4" style={{ fontSize: '14px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <div className="col-span-2">Creative Service</div>
              <div className="text-center">Quantity</div>
              <div className="text-right">Amount</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#fdf4ff', borderRadius: '0 0 16px 16px', padding: '8px' }}>
            {invoice.items?.map((item, idx) => (
              <div key={idx} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr', 
                padding: '20px 24px', 
                borderBottom: idx < invoice.items.length - 1 ? '2px dashed #e9d5ff' : 'none',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(244, 114, 182, 0.05)'
              }}>
                <div style={{ color: '#831843', fontWeight: '600', fontSize: '16px' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '28px', 
                    height: '28px', 
                    background: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)', 
                    borderRadius: '50%', 
                    textAlign: 'center', 
                    lineHeight: '28px', 
                    color: 'white', 
                    fontSize: '12px', 
                    fontWeight: '700',
                    marginRight: '12px' 
                  }}>{idx + 1}</span>
                  {item.description}
                </div>
                <div style={{ textAlign: 'center', color: '#6b21a8', fontWeight: '500' }}>{item.quantity}</div>
                <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '18px', background: 'linear-gradient(90deg, #f472b6 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ${(item.quantity * parseFloat(item.price)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Creative Total with Animated Gradient */}
        <div className="px-8 pb-8">
          <div className="flex justify-end">
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)',
              padding: '24px 32px',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(236, 72, 153, 0.3)',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount Due</div>
              <div style={{ fontSize: '42px', fontWeight: '800', color: 'white', letterSpacing: '-1px' }}>
                ${invoice.total.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>USD</div>
            </div>
          </div>
        </div>

        {/* Creative Footer */}
        <div className="px-8 pb-8">
          <div style={{ textAlign: 'center', padding: '24px', background: 'linear-gradient(90deg, rgba(244,114,182,0.1) 0%, rgba(167,139,250,0.1) 100%)', borderRadius: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', background: 'linear-gradient(90deg, #f472b6 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
              Let's create something amazing together!
            </p>
            <p style={{ fontSize: '12px', color: '#9333ea' }}>Thank you for choosing our creative services</p>
          </div>
        </div>
      </div>
    ),
  },

  // Corporate Blue - Enterprise, B2B, corporate services
  corporate: {
    id: 'corporate',
    name: 'Corporate Pro',
    icon: <FiHome className="w-5 h-5" style={{ color: '#1e3a8a' }} />,
    category: 'Enterprise & B2B',
    isPremium: true,
    color: '#1e3a8a',
    description: 'Fortune 500 style with navy blue and serif fonts',
    render: (invoice, isPremium) => (
      <div className="bg-white shadow-2xl" style={{ fontFamily: 'Georgia, serif' }}>
        {/* Corporate Header with Navy Blue */}
        <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '40px' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '36px', fontFamily: 'Georgia, serif', fontWeight: '300', letterSpacing: '4px' }}>INVOICE</h1>
              <div style={{ marginTop: '8px', height: '2px', width: '80px', backgroundColor: '#1e3a8a' }}></div>
            </div>
            <div className="text-right">
              {(() => {
                const logoUrl = getBrandLogoUrl({ plan: isPremium ? 'pro' : 'free', orgLogoUrl: invoice.logo_url });
                return logoUrl ? (
                  <img src={logoUrl} alt="" style={{ maxHeight: '60px', marginBottom: '10px', marginLeft: 'auto' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : null;
              })()}
              <div style={{ fontSize: '24px', fontFamily: 'Georgia, serif', fontWeight: '600', color: '#cbd5e1' }}>
                {invoice.business_name || 'CORPORATE ENTERPRISES INC.'}
              </div>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                {invoice.business_tagline || 'Excellence in Professional Services'}
              </p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {invoice.business_email || 'accounts@corporate.com'} | {invoice.business_phone || '+1 (800) 555-CORP'}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Details Bar with Corporate Styling */}
        <div style={{ backgroundColor: '#1e293b', padding: '16px 40px', borderBottom: '1px solid #334155' }}>
          <div className="flex justify-between" style={{ fontSize: '14px' }}>
            <div>
              <span style={{ fontWeight: '600', color: '#94a3b8' }}>INVOICE NO:</span> 
              <span style={{ color: '#f1f5f9', fontWeight: '700', marginLeft: '8px' }}>#{String(invoice.id).padStart(8, '0')}</span>
            </div>
            <div>
              <span style={{ fontWeight: '600', color: '#94a3b8' }}>ISSUE DATE:</span> 
              <span style={{ color: '#f1f5f9', marginLeft: '8px' }}>{new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div>
              <span style={{ fontWeight: '600', color: '#94a3b8' }}>DUE DATE:</span> 
              <span style={{ color: '#f1f5f9', marginLeft: '8px' }}>{invoice.due_date || 'NET 30 DAYS'}</span>
            </div>
            <div>
              <span style={{ fontWeight: '600', color: '#94a3b8' }}>STATUS:</span> 
              <span style={{ color: '#3b82f6', fontWeight: '700', marginLeft: '8px' }}>OUTSTANDING</span>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bill To:</h3>
              <div className="text-gray-900">
                <p className="font-semibold text-lg mb-1">{invoice.client_name}</p>
                <p className="text-gray-600">{invoice.client_email}</p>
                {invoice.client_company && <p className="text-gray-600">{invoice.client_company}</p>}
                {invoice.client_address && <p className="text-gray-600">{invoice.client_address}</p>}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Information:</h3>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">Account: CORP-2024-{invoice.id}</p>
                <p className="text-sm text-gray-600 mb-1">Terms: Net 30</p>
                <p className="text-sm text-gray-600">PO Number: {invoice.po_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Professional Services Table with Executive Styling */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              border: '2px solid #1e3a8a',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px rgba(30, 58, 138, 0.1)'
            }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)',
                    color: 'white'
                  }}>
                    <th style={{ 
                      textAlign: 'left',
                      padding: '18px 24px',
                      fontFamily: 'Baskerville, Georgia, serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '1.5px',
                      borderRight: '1px solid rgba(255,255,255,0.2)'
                    }}>PROFESSIONAL SERVICE</th>
                    <th style={{ 
                      textAlign: 'center',
                      padding: '18px',
                      fontFamily: 'Baskerville, Georgia, serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '1.5px',
                      borderRight: '1px solid rgba(255,255,255,0.2)'
                    }}>HOURS</th>
                    <th style={{ 
                      textAlign: 'right',
                      padding: '18px',
                      fontFamily: 'Baskerville, Georgia, serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '1.5px',
                      borderRight: '1px solid rgba(255,255,255,0.2)'
                    }}>RATE</th>
                    <th style={{ 
                      textAlign: 'right',
                      padding: '18px 24px',
                      fontFamily: 'Baskerville, Georgia, serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '1.5px'
                    }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: idx < invoice.items.length - 1 ? '1px solid #e0e7ff' : 'none',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}>
                      <td style={{ 
                        padding: '20px 24px',
                        color: '#0c1e3d',
                        fontFamily: 'Baskerville, Georgia, serif',
                        fontSize: '15px',
                        borderRight: '1px solid #e0e7ff'
                      }}>
                        <div style={{ fontWeight: '600' }}>{item.description}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>Professional Service</div>
                      </td>
                      <td style={{ 
                        textAlign: 'center',
                        padding: '20px',
                        color: '#1e293b',
                        fontFamily: 'Georgia, serif',
                        fontSize: '15px',
                        fontWeight: '600',
                        borderRight: '1px solid #e0e7ff'
                      }}>{item.quantity}</td>
                      <td style={{ 
                        textAlign: 'right',
                        padding: '20px',
                        color: '#1e293b',
                        fontFamily: 'Georgia, serif',
                        fontSize: '15px',
                        borderRight: '1px solid #e0e7ff'
                      }}>${parseFloat(item.price).toFixed(2)}</td>
                      <td style={{ 
                        textAlign: 'right',
                        padding: '20px 24px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#1e3a8a',
                        fontFamily: 'Baskerville, Georgia, serif'
                      }}>
                        ${(item.quantity * parseFloat(item.price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Executive Total Section */}
          <div className="flex justify-end" style={{ marginBottom: '30px' }}>
            <div style={{ width: '400px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
                border: '2px solid #1e3a8a',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 4px 6px rgba(30, 58, 138, 0.1)'
              }}>
                <div className="flex justify-between" style={{ marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'Baskerville, Georgia, serif', fontSize: '14px', color: '#475569' }}>Subtotal</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e293b' }}>${invoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{ marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'Baskerville, Georgia, serif', fontSize: '14px', color: '#475569' }}>Professional Discount</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e293b' }}>$0.00</span>
                </div>
                <div className="flex justify-between" style={{ marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'Baskerville, Georgia, serif', fontSize: '14px', color: '#475569' }}>Tax (0%)</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e293b' }}>$0.00</span>
                </div>
                <div style={{ 
                  borderTop: '2px solid #1e3a8a',
                  paddingTop: '16px',
                  marginTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontFamily: 'Baskerville, Georgia, serif',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#0c1e3d',
                    letterSpacing: '1px'
                  }}>TOTAL DUE</span>
                  <span style={{ 
                    fontFamily: 'Baskerville, Georgia, serif',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#1e3a8a'
                  }}>${invoice.total.toFixed(2)}</span>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>USD - United States Dollar</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Corporate Footer */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0c1e3d 0%, #1e3a8a 50%, #0c1e3d 100%)',
          color: 'white',
          padding: '32px 40px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p style={{ 
              fontSize: '11px',
              color: '#93c5fd',
              fontFamily: 'Baskerville, Georgia, serif',
              letterSpacing: '2px',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              Payment Terms: NET 30 DAYS • Wire Transfer Preferred
            </p>
            <div style={{ 
              width: '80px',
              height: '1px',
              backgroundColor: '#60a5fa',
              margin: '16px auto'
            }}></div>
            <p style={{ 
              fontSize: '16px',
              color: '#ffffff',
              fontFamily: 'Baskerville, Georgia, serif',
              fontStyle: 'italic',
              marginBottom: '8px'
            }}>
              "We value your partnership and commitment to excellence"
            </p>
            <p style={{ fontSize: '12px', color: '#93c5fd', marginTop: '16px' }}>
              {invoice.business_name || 'CORPORATE ENTERPRISES INC.'} • EST. 2024
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // Medical/Healthcare - Clinics, hospitals, healthcare providers
  medical: {
    id: 'medical',
    name: 'Healthcare Pro',
    icon: <FiActivity className="w-5 h-5" />,
    category: 'Medical & Healthcare',
    isPremium: true,
    render: (invoice, isPremium) => (
      <div className="bg-white p-8 shadow-lg rounded-lg border-2 border-teal-500">
        {/* Medical Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 -m-8 mb-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <FiActivity className="text-3xl text-[#059669]" />
                Medical Invoice
              </h1>
              <p className="text-teal-100 mt-1">Professional Healthcare Services</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{invoice.business_name || 'Healthcare Provider'}</p>
              <p className="text-sm text-teal-100">License #: {invoice.license_number || 'HC-123456'}</p>
              <p className="text-sm text-teal-100">Tax ID: {invoice.tax_id || '98-7654321'}</p>
            </div>
          </div>
        </div>

        {/* Patient/Client Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-teal-50 rounded-lg">
            <h3 className="text-sm font-semibold text-teal-700 mb-2">Patient/Client Information</h3>
            <p className="font-semibold text-gray-900">{invoice.client_name}</p>
            <p className="text-sm text-gray-600">{invoice.client_email}</p>
            <p className="text-sm text-gray-600 mt-2">Patient ID: #{invoice.id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Invoice Details</h3>
            <p className="text-sm text-gray-600">Invoice #: {invoice.id}</p>
            <p className="text-sm text-gray-600">Service Date: {invoice.date}</p>
            <p className="text-sm text-gray-600">Due Date: {invoice.due_date || 'Upon Receipt'}</p>
          </div>
        </div>

        {/* Medical Services Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Services Rendered</h3>
          <table className="w-full">
            <thead>
              <tr className="bg-teal-100">
                <th className="text-left py-3 px-4 text-teal-800 font-semibold">Service/Procedure</th>
                <th className="text-center py-3 px-4 text-teal-800 font-semibold">Code</th>
                <th className="text-center py-3 px-4 text-teal-800 font-semibold">Units</th>
                <th className="text-right py-3 px-4 text-teal-800 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-900">{item.description}</td>
                  <td className="text-center py-3 px-4 text-gray-600">CPT-{1000 + idx}</td>
                  <td className="text-center py-3 px-4 text-gray-600">{item.quantity}</td>
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    ${(item.quantity * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Billing Summary */}
        <div className="flex justify-end mb-6">
          <div className="w-80 p-4 bg-teal-50 rounded-lg">
            <h3 className="text-sm font-semibold text-teal-700 mb-3">Billing Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Services Total:</span>
                <span className="text-gray-900">${invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance Coverage:</span>
                <span className="text-gray-900">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Adjustments:</span>
                <span className="text-gray-900">$0.00</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-teal-300">
                <span className="font-semibold text-teal-700">Balance Due:</span>
                <span className="font-bold text-xl text-teal-600">${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Footer */}
        <div className="border-t pt-4 text-center">
          <p className="text-xs text-gray-600">
            This invoice is for professional medical services rendered. 
            Please remit payment within 30 days to avoid late fees.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            For billing questions, contact: billing@healthcare.com | 1-800-HEALTH
          </p>
        </div>
      </div>
    ),
  },
};

// Template Selection Component
export const TemplateSelector = ({ selectedTemplate, onSelectTemplate, isPremium }) => {
  const templates = Object.values(InvoiceTemplates);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          onClick={() => {
            if (!template.isPremium || isPremium) {
              onSelectTemplate(template.id);
            }
          }}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedTemplate === template.id
              ? 'border-[#2563EB] bg-gradient-to-br from-blue-50 to-indigo-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          } ${template.isPremium && !isPremium ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{template.icon}</span>
            {template.isPremium && (
              <span className="text-xs px-2 py-1 bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white rounded-full font-semibold">
                PRO
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
          <p className="text-xs text-gray-600">{template.category}</p>
          {template.isPremium && !isPremium && (
            <p className="text-xs text-accent-primary mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Upgrade to use
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default InvoiceTemplates;