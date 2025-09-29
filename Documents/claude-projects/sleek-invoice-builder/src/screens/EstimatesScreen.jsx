
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button } from '../utils/platformComponents';
import { getDocuments } from '../services/documentService';

const EstimatesScreen = ({ navigation }) => {
  const [estimates, setEstimates] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchEstimates = async () => {
      const { documents } = await getDocuments('estimate', page);
      setEstimates(documents);
    };
    fetchEstimates();
  }, [page]);

  const handleConvertToInvoice = (estimate) => {
    const invoiceData = { ...estimate, documentType: 'invoice', status: 'pending' };
    navigation.navigate('InvoiceForm', { invoice: invoiceData });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Create New Estimate" onPress={() => navigation.navigate('CreateEstimate')} />
      <FlatList
        data={estimates}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
            <Text>{item.clientName}</Text>
            <Text>Total: ${item.total}</Text>
            <Button title="Convert to Invoice" onPress={() => handleConvertToInvoice(item)} />
          </View>
        )}
      />
    </View>
  );
};

export default EstimatesScreen;
