import React, { useState } from 'react';
import './index.css';

// Simplified test app without Firebase
const TestApp = () => {
  const [view, setView] = useState('dashboard');
  const [invoices, setInvoices] = useState([
    { id: 1, client: 'Test Client 1', amount: 1500, date: '2024-01-15' },
    { id: 2, client: 'Test Client 2', amount: 2300, date: '2024-01-10' }
  ]);

  const Dashboard = () => (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Invoice Dashboard</h1>
        
        <button 
          onClick={() => setView('create')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-8"
        >
          Create New Invoice
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Recent Invoices</h2>
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice.id} className="border-b pb-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{invoice.client}</p>
                    <p className="text-sm text-gray-500">{invoice.date}</p>
                  </div>
                  <p className="text-xl font-bold">${invoice.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const CreateInvoice = () => (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Create Invoice</h1>
        
        <button 
          onClick={() => setView('dashboard')}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mb-8"
        >
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newInvoice = {
              id: invoices.length + 1,
              client: formData.get('client'),
              amount: parseFloat(formData.get('amount')),
              date: new Date().toISOString().split('T')[0]
            };
            setInvoices([...invoices, newInvoice]);
            setView('dashboard');
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Client Name
              </label>
              <input
                type="text"
                name="client"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>

            <button 
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Create Invoice
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return view === 'dashboard' ? <Dashboard /> : <CreateInvoice />;
};

export default TestApp;