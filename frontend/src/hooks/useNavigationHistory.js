import { useState, useCallback, useEffect } from 'react';
import { saveToStorage, loadFromStorage } from '../mock/mock';

const STORAGE_KEY = 'mmx_navigation_history';

/**
 * Custom hook for managing navigation history with back button functionality
 */
export function useNavigationHistory() {
  const [history, setHistory] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  // Save history to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEY, history);
  }, [history]);

  const pushState = useCallback((state) => {
    const newState = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...state
    };
    
    setHistory(prev => {
      // Avoid duplicate consecutive entries
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.type === newState.type && last.value === newState.value) {
          return prev;
        }
      }
      
      // Keep only last 20 entries to prevent memory issues
      const newHistory = [...prev, newState];
      return newHistory.slice(-20);
    });
  }, []);

  const goBack = useCallback(() => {
    if (history.length <= 1) return null;
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    // Remove current state from history
    setHistory(prev => prev.slice(0, -1));
    
    return { current, previous };
  }, [history]);

  const canGoBack = history.length > 1;
  const currentState = history[history.length - 1] || null;
  const previousState = history.length > 1 ? history[history.length - 2] : null;

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    pushState,
    goBack,
    canGoBack,
    currentState,
    previousState,
    clearHistory
  };
}