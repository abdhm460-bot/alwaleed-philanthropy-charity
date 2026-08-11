/**
 * Vercel Web Analytics Integration
 * This module initializes Vercel Web Analytics for the static site
 */

import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

console.log('Vercel Analytics initialized');
