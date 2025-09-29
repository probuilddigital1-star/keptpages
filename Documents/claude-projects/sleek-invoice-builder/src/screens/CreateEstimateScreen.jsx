
import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, Modal, TouchableOpacity } from '../utils/platformComponents';
import { createDocument } from '../services/documentService';

const CreateEstimateScreen = ({ navigation }) => {
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'service', description: '', quantity: '1', rate: '0', cost: '0' });

  const handleSaveEstimate = async () => {
    const total = items.reduce((sum, item) => {
      if (item.type === 'service') {
        return sum + parseFloat(item.rate) * parseFloat(item.quantity);
      } else {
        return sum + parseFloat(item.cost) * parseFloat(item.quantity);
      }
    }, 0);

    const estimateData = {
      documentType: 'estimate',
      clientName,
      items,
      notes,
      total,
      status: 'draft',
    };
    await createDocument(estimateData);
    navigation.goBack();
  };

  const handleAddItem = () => {
    setItems([...items, newItem]);
    setIsModalVisible(false);
    setNewItem({ type: 'service', description: '', quantity: '1', rate: '0', cost: '0' });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput placeholder="Client Name" value={clientName} onChangeText={setClientName} style={{ marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }} />
      
      <FlatList
        data={items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
            <Text>{item.description}</Text>
            <Text>Quantity: {item.quantity}</Text>
            {item.type === 'service' ? (
              <Text>Rate: ${item.rate}</Text>
            ) : (
              <Text>Cost: ${item.cost}</Text>
            )}
          </View>
        )}
      />
      <Button title="Add Item" onPress={() => setIsModalVisible(true)} />

      <TextInput placeholder="Notes" value={notes} onChangeText={setNotes} multiline style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#ccc', minHeight: 100 }} />

      <Button title="Save Estimate" onPress={handleSaveEstimate} />

      <Modal visible={isModalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, marginBottom: 20 }}>Add New Item</Text>
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <TouchableOpacity onPress={() => setNewItem({ ...newItem, type: 'service' })} style={{ padding: 10, backgroundColor: newItem.type === 'service' ? '#3498db' : '#ccc', marginRight: 10 }}>
              <Text style={{ color: 'white' }}>Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNewItem({ ...newItem, type: 'material' })} style={{ padding: 10, backgroundColor: newItem.type === 'material' ? '#3498db' : '#ccc' }}>
              <Text style={{ color: 'white' }}>Material</Text>
            </TouchableOpacity>
          </View>
          <TextInput placeholder="Description" value={newItem.description} onChangeText={(text) => setNewItem({ ...newItem, description: text })} style={{ marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }} />
          <TextInput placeholder="Quantity" value={newItem.quantity} onChangeText={(text) => setNewItem({ ...newItem, quantity: text })} keyboardType="numeric" style={{ marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }} />
          {newItem.type === 'service' ? (
            <TextInput placeholder="Rate" value={newItem.rate} onChangeText={(text) => setNewItem({ ...newItem, rate: text })} keyboardType="numeric" style={{ marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }} />
          ) : (
            <TextInput placeholder="Cost" value={newItem.cost} onChangeText={(text) => setNewItem({ ...newItem, cost: text })} keyboardType="numeric" style={{ marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }} />
          )}
          <Button title="Add" onPress={handleAddItem} />
          <Button title="Cancel" onPress={() => setIsModalVisible(false)} color="red" />
        </View>
      </Modal>
    </View>
  );
};

export default CreateEstimateScreen;
