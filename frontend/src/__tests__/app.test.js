/**
 * Smoke tests for PaisaGrow frontend (Item 28)
 * Tests authentication UI, skeleton states, and empty states.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the api module
jest.mock('../api', () => ({
  auth: {
    me: jest.fn().mockRejectedValue(new Error('Not logged in')),
    login: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
  },
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
  logoutApi: jest.fn(),
}));

// Mock AuthContext
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    signUp: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

import AuthPage from '../auth/AuthPage';
import Portfolio from '../pages/Portfolio';
import Skeleton from '../components/Skeleton';

describe('AuthPage', () => {
  test('renders login form with email input', () => {
    render(<AuthPage />);
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  test('register tab switch shows confirm password field', () => {
    render(<AuthPage />);
    const registerBtn = screen.getByText(/Register|Sign Up|Create/i);
    fireEvent.click(registerBtn);
    expect(screen.getByPlaceholderText(/confirm|repeat/i)).toBeInTheDocument();
  });

  test('forgot password link shows forgot form', () => {
    render(<AuthPage />);
    const forgotBtn = screen.getByText(/Forgot password/i);
    fireEvent.click(forgotBtn);
    expect(screen.getByText(/Reset|forgot/i)).toBeInTheDocument();
  });
});

describe('Portfolio', () => {
  const defaultProps = {
    budget: 10000,
    setBudget: jest.fn(),
    setPortfolio: jest.fn(),
    totalInvested: 0,
    currentValue: 0,
    profit: 0,
    prices: {},
  };

  test('skeleton renders during load (null portfolio)', () => {
    render(<Portfolio {...defaultProps} portfolio={null} />);
    // Skeleton divs have animation style
    const skeletons = document.querySelectorAll('[style*="pg-shimmer"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('empty state renders when portfolio is empty array', () => {
    render(<Portfolio {...defaultProps} portfolio={[]} />);
    expect(screen.getByText(/No holdings yet|make your first/i)).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  test('renders with default props', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild;
    expect(div).toBeInTheDocument();
    expect(div.style.animation).toContain('pg-shimmer');
  });
});
