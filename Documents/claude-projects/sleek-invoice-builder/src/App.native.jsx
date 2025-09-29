import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AnimatePresence } from 'moti';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './screens/Auth';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import EstimatesScreen from './screens/EstimatesScreen';
import CreateEstimateScreen from './screens/CreateEstimateScreen';

const Stack = createStackNavigator();

const AppContent = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AnimatePresence>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1e40af',
              height: 100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 24
            },
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0]
                      })
                    }
                  ],
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1]
                  })
                }
              };
            }
          }}
        >
          {!user ? (
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'Invoices' }}
              />
          <Stack.Screen 
            name="InvoiceForm" 
            component={InvoiceFormScreen}
            options={({ route }) => ({ 
              title: route.params?.invoice ? 'Edit Invoice' : 'Create Invoice' 
            })}
          />
              <Stack.Screen 
                name="InvoicePreview" 
                component={InvoicePreviewScreen}
                options={{ title: 'Invoice Preview' }}
              />
              <Stack.Screen 
                name="Estimates" 
                component={EstimatesScreen}
                options={{ title: 'Estimates' }}
              />
              <Stack.Screen 
                name="CreateEstimate" 
                component={CreateEstimateScreen}
                options={{ title: 'Create Estimate' }}
              />
            </>
          )}
        </Stack.Navigator>
      </AnimatePresence>
    </NavigationContainer>
  );
};

const DashboardScreen = ({ navigation }) => {
  return (
    <Dashboard
      onCreateInvoice={() => navigation.navigate('InvoiceForm')}
      onSelectInvoice={(invoice) => navigation.navigate('InvoicePreview', { invoice })}
      onNavigateToEstimates={() => navigation.navigate('Estimates')}
    />
  );
};

const InvoiceFormScreen = ({ navigation, route }) => {
  return (
    <InvoiceForm
      invoice={route.params?.invoice}
      onSave={() => navigation.navigate('Dashboard')}
      onCancel={() => navigation.goBack()}
    />
  );
};

const InvoicePreviewScreen = ({ navigation, route }) => {
  return (
    <InvoicePreview
      invoice={route.params.invoice}
      onEdit={() => navigation.navigate('InvoiceForm', { invoice: route.params.invoice })}
      onBack={() => navigation.goBack()}
    />
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;