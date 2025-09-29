import React, { useMemo, useState, useEffect } from 'react';
import Tooltip from './ui/Tooltip';
import { listInvoices } from '../store/invoices';
import { listClients } from '../store/clients';
import { listItems } from '../store/items';

function MobileNav({ currentView, onNavigate, onNewInvoice }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load invoices asynchronously
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await listInvoices();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (error) {
        // console.warn('Error loading invoices in MobileNav:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
    // Refresh periodically
    const interval = setInterval(loadInvoices, 5000);
    return () => clearInterval(interval);
  }, [currentView]);

  // Calculate badge counts
  const badgeCounts = useMemo(() => {
    // Use the loaded invoices from state
    const unpaidCount = invoices.filter(inv =>
      inv.status !== 'paid' && inv.status !== 'cancelled'
    ).length;
    const overdueCount = invoices.filter(inv => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
      if (!inv.date || !inv.terms) return false;
      const dueDate = new Date(inv.date);
      const daysToAdd = parseInt(inv.terms?.match(/\d+/)?.[0] || '30');
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      return dueDate < new Date();
    }).length;

    return {
      dashboard: overdueCount > 0 ? overdueCount : unpaidCount > 0 ? unpaidCount : 0,
      clients: listClients().length === 0 ? '!' : 0, // Show ! if no clients
      items: listItems().length === 0 ? '!' : 0, // Show ! if no items
      settings: 0
    };
  }, [invoices, currentView]);
  const navItems = [
    {
      view: 'dashboard',
      label: 'Dashboard',
      badge: badgeCounts.dashboard,
      badgeType: badgeCounts.dashboard > 0 ? 'warning' : 'default',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      view: 'clients',
      label: 'Clients',
      badge: badgeCounts.clients,
      badgeType: badgeCounts.clients === '!' ? 'info' : 'default',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      view: 'items',
      label: 'Products',
      badge: badgeCounts.items,
      badgeType: badgeCounts.items === '!' ? 'info' : 'default',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      view: 'settings',
      label: 'Settings',
      badge: badgeCounts.settings,
      badgeType: 'default',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav md:hidden">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`mobile-nav-item ${currentView === item.view ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon relative">
              {item.icon}
              {item.badge !== 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  item.badgeType === 'warning'
                    ? 'bg-orange-500 text-white'
                    : item.badgeType === 'info'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-500 text-white'
                } animate-fade-in-up`}>
                  {item.badge}
                </span>
              )}
            </span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating Action Button for Creating Invoices */}
      <Tooltip content="Create new invoice" position="left">
        <button
          className={`fab md:hidden ${listInvoices().length === 0 ? 'pulse' : ''}`}
          onClick={onNewInvoice}
          aria-label="Create new invoice"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </Tooltip>
    </>
  );
}

export default MobileNav;