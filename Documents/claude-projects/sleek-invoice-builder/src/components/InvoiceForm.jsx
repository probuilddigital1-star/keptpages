
import { logError, logInfo } from '../utils/errorHandler';
import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Platform, TouchableOpacity } from '../utils/platformComponents';
import * as ImagePicker from 'expo-image-picker';
import Input from './Input';
import Button from './Button';
import Card from './Card';
import { createDocument, updateDocument } from '../services/documentService';

const InvoiceForm = ({ invoice = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    number: invoice?.number || '',
    clientName: invoice?.clientName || '',
    clientEmail: invoice?.clientEmail || '',
    clientAddress: invoice?.clientAddress || '',
    items: invoice?.items || [{ type: 'service', description: '', quantity: 1, rate: 0, cost: 0 }],
    dueDate: invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    logo: invoice?.logo || null,
    notes: invoice?.notes || ''
  });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async () => {
    // ... (keep existing image upload logic)
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type: 'service', description: '', quantity: 1, rate: 0, cost: 0 }]
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      if (item.type === 'service') {
        return sum + (item.quantity * item.rate);
      } else {
        return sum + (item.quantity * item.cost);
      }
    }, 0);
  };

  const validate = () => {
    // ... (keep existing validation logic)
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const payload = {
        ...formData,
        total: calculateTotal(),
        status: invoice?.status || 'pending',
        documentType: 'invoice'
      };

      if (invoice) {
        await updateDocument(invoice.id, payload);
      } else {
        await createDocument(payload);
      }
      
      onSave();
    } catch (error) {
      logError('InvoiceForm.save', error);
    }
  };

  const FormContent = () => (
    <>
      {/* ... (keep existing form content for invoice details, client info) */}

      <Card className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Items</Text>
          <Button onPress={addItem} variant="accent" className="px-4 py-2">
            Add Item
          </Button>
        </View>

        {errors.items && <Text className="text-red-500 mb-2">{errors.items}</Text>}

        {formData.items.map((item, index) => (
          <Card key={index} className="mb-4 bg-gray-50 dark:bg-gray-700" shadow="none">
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => updateItem(index, 'type', 'service')} style={{ padding: 10, backgroundColor: item.type === 'service' ? '#3498db' : '#ccc', marginRight: 10 }}>
                <Text style={{ color: 'white' }}>Service</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateItem(index, 'type', 'material')} style={{ padding: 10, backgroundColor: item.type === 'material' ? '#3498db' : '#ccc' }}>
                <Text style={{ color: 'white' }}>Material</Text>
              </TouchableOpacity>
            </View>
            <Input
              label="Description"
              value={item.description}
              onChangeText={(text) => updateItem(index, 'description', text)}
              placeholder="Product or service"
            />
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Input
                  label="Quantity"
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 0)}
                  type="number"
                />
              </View>
              <View className="flex-1">
                {item.type === 'service' ? (
                  <Input
                    label="Rate"
                    value={item.rate.toString()}
                    onChangeText={(text) => updateItem(index, 'rate', parseFloat(text) || 0)}
                    type="number"
                  />
                ) : (
                  <Input
                    label="Cost"
                    value={item.cost.toString()}
                    onChangeText={(text) => updateItem(index, 'cost', parseFloat(text) || 0)}
                    type="number"
                  />
                )}
              </View>
            </View>
            {formData.items.length > 1 && (
              <Button onPress={() => removeItem(index)} variant="outline" className="mt-2">
                Remove Item
              </Button>
            )}
          </Card>
        ))}

        <View className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-600">
          <Text className="text-2xl font-bold text-right text-primary">
            Total: ${calculateTotal().toFixed(2)}
          </Text>
        </View>
      </Card>

      {/* ... (keep existing form content for notes, buttons) */}
    </>
  );

  // ... (keep existing platform-specific rendering)
};

export default InvoiceForm;
