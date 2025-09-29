import React, { useState } from 'react';
import Dashboard from './components/Dashboard.simple';
import InvoiceForm from './components/InvoiceForm.enhanced';
import InvoicePreview from './components/InvoicePreview.simple';
import './index.css';

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setCurrentView('form');
  };

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('preview');
  };

  const handleEditInvoice = () => {
    setCurrentView('form');
  };

  const handleSaveInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('preview');
  };

  const handleBack = () => {
    setCurrentView('dashboard');
    setSelectedInvoice(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {currentView === 'dashboard' && (
        <Dashboard
          onCreateInvoice={handleCreateInvoice}
          onSelectInvoice={handleSelectInvoice}
        />
      )}
      
      {currentView === 'form' && (
        <InvoiceForm
          invoice={selectedInvoice}
          onSave={handleSaveInvoice}
          onCancel={handleBack}
        />
      )}
      
      {currentView === 'preview' && selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onEdit={handleEditInvoice}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default App;