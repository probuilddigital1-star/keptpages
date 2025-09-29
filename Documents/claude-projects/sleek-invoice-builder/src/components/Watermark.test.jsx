import React from 'react';
import { render, screen } from '@testing-library/react';
import Watermark from './Watermark';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the authService
jest.mock('../services/authService', () => ({
  isPremium: jest.fn(() => false),
  onAuthStateChange: jest.fn(() => () => {}),
  initializeIAP: jest.fn(),
  setupPurchaseListeners: jest.fn(),
  cleanupPurchaseListeners: jest.fn(),
}));

describe('Watermark Component', () => {
  it('should show watermark for free users', () => {
    const { container } = render(
      <AuthProvider>
        <Watermark>
          <div>Invoice Content</div>
        </Watermark>
      </AuthProvider>
    );
    
    expect(screen.getByText('Created with Sleek Invoice')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Pro to remove watermark')).toBeInTheDocument();
  });

  it('should hide watermark for premium users', () => {
    // Mock isPremium to return true
    const authService = require('../services/authService');
    authService.isPremium.mockReturnValue(true);
    
    const { container } = render(
      <AuthProvider>
        <Watermark>
          <div>Invoice Content</div>
        </Watermark>
      </AuthProvider>
    );
    
    expect(screen.queryByText('Created with Sleek Invoice')).not.toBeInTheDocument();
    expect(screen.queryByText('Upgrade to Pro to remove watermark')).not.toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <AuthProvider>
        <Watermark>
          <div data-testid="invoice-content">Invoice Content</div>
        </Watermark>
      </AuthProvider>
    );
    
    expect(screen.getByTestId('invoice-content')).toBeInTheDocument();
  });
});

export default Watermark.test;