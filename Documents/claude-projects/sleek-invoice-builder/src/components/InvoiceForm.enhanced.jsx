import { logError, logInfo } from '../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InvoiceForm = ({ invoice, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setFormData({
        client_name: invoice.client_name || '',
        client_email: invoice.client_email || '',
        items: invoice.items || [{ description: '', quantity: 1, price: 0 }],
        logo_url: invoice.logo_url || ''
      });
    }
  }, [invoice]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (parseFloat(item.quantity || 0) * parseFloat(item.price || 0));
    }, 0).toFixed(2);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return `http://localhost:3000${response.data.url}`;
    } catch (error) {
      logError('InvoiceFormEnhanced.to', error);
      alert('Failed to upload logo. Proceeding without logo.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Upload logo if selected
      let logoUrl = formData.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const invoiceData = {
        ...formData,
        logo_url: logoUrl,
        total: parseFloat(calculateTotal())
      };

      let response;
      if (invoice?.id) {
        response = await axios.put(`http://localhost:3000/api/invoices/${invoice.id}`, invoiceData);
      } else {
        response = await axios.post('http://localhost:3000/api/invoices', invoiceData);
      }
      
      // Pass the created/updated invoice back to the parent
      onSave(response.data);
    } catch (error) {
      logError('InvoiceFormEnhanced.to', error);
      alert(`Failed to save invoice: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold text-gray-900">
            {invoice ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800 text-lg font-medium"
            disabled={saving}
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg">
          {/* Logo Upload Section */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                disabled={uploading || saving}
              />
              {uploading && <span className="text-blue-600">Uploading...</span>}
              {formData.logo_url && (
                <div className="flex items-center gap-2">
                  <img src={formData.logo_url} alt="Logo preview" className="h-16 w-auto max-w-48 object-contain rounded-lg" />
                  <span className="text-sm text-green-600">Current logo</span>
                </div>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email *
              </label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => handleInputChange('client_email', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                required
                disabled={saving}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
                disabled={saving}
              >
                + Add Item
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Service or product description"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    placeholder="0.00"
                    required
                    disabled={saving}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-lg font-semibold text-gray-900 p-2">
                    ${(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toFixed(2)}
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 p-2 rounded font-medium"
                      disabled={saving}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total and Submit */}
          <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              Total: ${calculateTotal()}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving || uploading}
              >
                {saving ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;