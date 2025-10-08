// lib/voice-config/service-defaults.ts
// Default services by industry for auto-population

interface ServiceDefault {
  name: string
  priceRange?: string
}

export const INDUSTRY_SERVICE_DEFAULTS: Record<string, ServiceDefault[]> = {
  hvac: [
    { name: 'AC Repair', priceRange: '$150-$500' },
    { name: 'Heating Repair', priceRange: '$150-$500' },
    { name: 'Maintenance Tune-up', priceRange: '$99-$200' },
    { name: 'System Installation', priceRange: '$3,000-$10,000' },
    { name: 'Emergency Service', priceRange: '$200-$750' }
  ],

  plumbing: [
    { name: 'Leak Repair', priceRange: '$150-$400' },
    { name: 'Drain Cleaning', priceRange: '$100-$300' },
    { name: 'Water Heater Service', priceRange: '$150-$500' },
    { name: 'Toilet Repair', priceRange: '$100-$250' },
    { name: 'Emergency Plumbing', priceRange: '$200-$600' }
  ],

  electrical: [
    { name: 'Outlet & Switch Repair', priceRange: '$100-$250' },
    { name: 'Panel Upgrade', priceRange: '$1,500-$3,000' },
    { name: 'Lighting Installation', priceRange: '$100-$500' },
    { name: 'Generator Installation', priceRange: '$3,000-$8,000' },
    { name: 'Emergency Electrical', priceRange: '$200-$600' }
  ],

  roofing: [
    { name: 'Roof Repair', priceRange: '$300-$1,500' },
    { name: 'Roof Replacement', priceRange: '$8,000-$20,000' },
    { name: 'Gutter Cleaning', priceRange: '$100-$300' },
    { name: 'Roof Inspection', priceRange: '$150-$400' },
    { name: 'Emergency Tarping', priceRange: '$300-$800' }
  ],

  landscaping: [
    { name: 'Lawn Care', priceRange: '$50-$150/visit' },
    { name: 'Tree Trimming', priceRange: '$200-$800' },
    { name: 'Landscape Design', priceRange: '$500-$5,000' },
    { name: 'Seasonal Cleanup', priceRange: '$150-$500' },
    { name: 'Irrigation Service', priceRange: '$100-$400' }
  ],

  pool_service: [
    { name: 'Weekly Cleaning', priceRange: '$80-$150/week' },
    { name: 'Chemical Balancing', priceRange: '$50-$100' },
    { name: 'Equipment Repair', priceRange: '$150-$500' },
    { name: 'Pool Opening/Closing', priceRange: '$150-$400' },
    { name: 'Green Pool Cleanup', priceRange: '$300-$800' }
  ]
}

// Get default key info by industry
export const INDUSTRY_KEY_INFO: Record<string, string[]> = {
  hvac: [
    'Licensed & Insured',
    '24/7 Emergency Service',
    'Same-Day Service Available',
    'Free Estimates on Installations'
  ],
  plumbing: [
    'Licensed & Insured',
    '24/7 Emergency Service',
    'Same-Day Service Available',
    'No Hidden Fees'
  ],
  electrical: [
    'Licensed & Insured',
    '24/7 Emergency Service',
    'Code Compliant Work',
    'Free Safety Inspections'
  ],
  roofing: [
    'Licensed & Insured',
    'Free Roof Inspections',
    'Insurance Claim Assistance',
    'Lifetime Warranty Available'
  ],
  landscaping: [
    'Licensed & Insured',
    'Free Estimates',
    'Seasonal Contracts Available',
    'Eco-Friendly Options'
  ],
  pool_service: [
    'Licensed & Insured',
    'Weekly Service Plans',
    'Free Water Testing',
    'Equipment Warranty'
  ]
}
