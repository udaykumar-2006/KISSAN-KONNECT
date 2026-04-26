import React, { createContext, useContext, useState, useCallback } from 'react';
import { ratingsData, buyerRatingsData } from '@/data/ratingsData';

// ─────────────────────────────────────────────────────────
// AppStore now only holds:
//  • ratings / buyerRatings (still mock-backed for legacy use,
//    but BuyerOrders / FarmerOrders call the real API directly)
//
// Bargains and Orders are no longer stored here — they are
// fetched from the real backend inside each page component.
// ─────────────────────────────────────────────────────────

const AppContext = createContext(undefined);

let ratingCounter = 100;

export const AppProvider = ({ children }) => {
  const [ratings,      setRatings]      = useState([...ratingsData]);
  const [buyerRatings, setBuyerRatings] = useState([...buyerRatingsData]);

  // ── Crop ratings (legacy local — pages also call api.rateCrop directly) ──
  const addRating = useCallback((rating) => {
    setRatings(prev => [
      ...prev,
      { ...rating, id: `r${++ratingCounter}`, createdAt: new Date().toISOString().split('T')[0] }
    ]);
  }, []);

  const getCropRatings = useCallback((cropId) => {
    return ratings.filter(r => r.cropId === cropId);
  }, [ratings]);

  const getCropAvgRating = useCallback((cropId) => {
    const cr = ratings.filter(r => r.cropId === cropId);
    return cr.length === 0 ? 0 : cr.reduce((s, r) => s + r.rating, 0) / cr.length;
  }, [ratings]);

  // ── Buyer ratings (legacy local) ──
  const addBuyerRating = useCallback((rating) => {
    setBuyerRatings(prev => [
      ...prev,
      { ...rating, id: `br${++ratingCounter}`, createdAt: new Date().toISOString().split('T')[0] }
    ]);
  }, []);

  const getBuyerRatings = useCallback((buyerId) => {
    return buyerRatings.filter(r => r.buyerId === buyerId);
  }, [buyerRatings]);

  const getBuyerAvgRating = useCallback((buyerId) => {
    const br = buyerRatings.filter(r => r.buyerId === buyerId);
    return br.length === 0 ? 0 : br.reduce((s, r) => s + r.rating, 0) / br.length;
  }, [buyerRatings]);

  return (
    <AppContext.Provider value={{
      ratings,
      buyerRatings,
      addRating,
      getCropRatings,
      getCropAvgRating,
      addBuyerRating,
      getBuyerRatings,
      getBuyerAvgRating,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
};
