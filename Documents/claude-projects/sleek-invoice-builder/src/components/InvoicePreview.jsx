import { logError, logInfo } from '../utils/errorHandler';
import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Platform } from '../utils/platformComponents';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Watermark from './Watermark';

const InvoicePreview = ({ invoice, onEdit, onBack }) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${process.env.API_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`,
        {},
        { responseType: 'blob' }
      );

      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoice.number}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      logError('InvoicePreview.pdf', error);
    } finally {
      setGenerating(false);
    }
  };

  const PreviewContent = () => (
    <>
      <Watermark className="mb-6">
        <Card shadow="soft-lg">
        <View className="flex-row justify-between items-start mb-6">
          <View>
            {invoice.logo && (
              <Image source={{ uri: invoice.logo }} className="w-24 h-24 rounded-2xl mb-4" />
            )}
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Invoice #{invoice.number}
            </Text>
          </View>
          <View className="text-right">
            <Text className={`text-2xl font-bold ${
              invoice.status === 'paid' ? 'text-green-600' : 
              invoice.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {invoice.status.toUpperCase()}
            </Text>
            <Text className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Due: {new Date(invoice.dueDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View className="border-t-2 border-gray-200 dark:border-gray-600 pt-6 mb-6">
          <Text className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Bill To:</Text>
          <Text className="text-lg text-gray-700 dark:text-gray-300">{invoice.clientName}</Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400">{invoice.clientEmail}</Text>
          {invoice.clientAddress && (
            <Text className="text-lg text-gray-600 dark:text-gray-400">{invoice.clientAddress}</Text>
          )}
        </View>

        <View className="mb-6">
          <View className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-2">
            <View className="flex-row justify-between mb-2">
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300" style={{flex: 1}}>Item</Text>
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300" style={{flex: 2}}>Description</Text>
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 w-16 text-center">QTY</Text>
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 w-20 text-right">Unit</Text>
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">Line Total</Text>
            </View>
          </View>

          {invoice.items.map((item, index) => (
            <View key={index} className="flex-row justify-between py-3 border-b border-gray-200 dark:border-gray-600">
              <Text className="text-lg text-gray-900 dark:text-gray-100" style={{flex: 1}}>
                {item.title || 'Item'}
              </Text>
              <Text className="text-lg text-gray-600 dark:text-gray-400" style={{flex: 2, whiteSpace: 'pre-line'}}>
                {item.description || ''}
              </Text>
              <Text className="text-lg text-gray-600 dark:text-gray-400 w-16 text-center">
                {item.quantity || item.qty || 0}
              </Text>
              <Text className="text-lg text-gray-600 dark:text-gray-400 w-20 text-right">
                ${(item.price || item.rate || 0).toFixed(2)}
              </Text>
              <Text className="text-lg font-medium text-gray-900 dark:text-white w-24 text-right">
                ${((item.quantity || item.qty || 0) * (item.price || item.rate || 0)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View className="border-t-2 border-gray-200 dark:border-gray-600 pt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">Total</Text>
            <Text className="text-xl font-bold text-primary">${invoice.total.toFixed(2)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-600">
            <Text className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Notes:</Text>
            <Text className="text-lg text-gray-600 dark:text-gray-400">{invoice.notes}</Text>
          </View>
        )}
        </Card>
      </Watermark>

      <View className="flex-row gap-4">
        <Button onPress={onBack} variant="secondary" className="flex-1">
          Back
        </Button>
        <Button onPress={onEdit} variant="outline" className="flex-1">
          Edit
        </Button>
        <Button onPress={handleGeneratePDF} variant="primary" className="flex-1" disabled={generating}>
          {generating ? 'Generating...' : 'Download PDF'}
        </Button>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Invoice Preview</h1>
        <PreviewContent />
      </div>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-4 py-8">
        <Text className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Invoice Preview</Text>
        <PreviewContent />
      </View>
    </ScrollView>
  );
};

export default InvoicePreview;