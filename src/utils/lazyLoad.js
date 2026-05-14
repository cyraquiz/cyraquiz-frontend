import { lazy } from 'react';

// Lazy load landing page components for better initial load
export const LazyFeatures = lazy(() => import('../components/landing/Features'));
export const LazyHowItWorks = lazy(() => import('../components/landing/HowItWorks'));
export const LazyContact = lazy(() => import('../components/landing/Contact'));
export const LazyFooter = lazy(() => import('../components/landing/Footer'));
