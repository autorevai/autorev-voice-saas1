// lib/voice-config/service-defaults.ts
// Default services by industry for auto-population

interface ServiceDefault {
  name: string
  priceRange?: string
  description?: string
}

export const INDUSTRY_SERVICE_DEFAULTS: Record<string, ServiceDefault[]> = {
  hvac: [
    { name: 'AC Repair', priceRange: '$150-$500', description: 'Air conditioning repair and diagnostics' },
    { name: 'Heating Repair', priceRange: '$150-$500', description: 'Furnace and heating system repair' },
    { name: 'Maintenance Tune-up', priceRange: '$99-$200', description: 'Seasonal maintenance and inspection' },
    { name: 'System Installation', priceRange: '$3,000-$10,000', description: 'New HVAC system installation' },
    { name: 'Emergency Service', priceRange: '$200-$750', description: '24/7 emergency HVAC service' }
  ],

  plumbing: [
    { name: 'Leak Repair', priceRange: '$150-$400', description: 'Fix leaks and water damage' },
    { name: 'Drain Cleaning', priceRange: '$100-$300', description: 'Unclog drains and sewer lines' },
    { name: 'Water Heater Service', priceRange: '$150-$500', description: 'Repair or replace water heaters' },
    { name: 'Toilet Repair', priceRange: '$100-$250', description: 'Fix running or clogged toilets' },
    { name: 'Emergency Plumbing', priceRange: '$200-$600', description: '24/7 emergency plumbing service' }
  ],

  electrical: [
    { name: 'Outlet & Switch Repair', priceRange: '$100-$250', description: 'Fix electrical outlets and switches' },
    { name: 'Panel Upgrade', priceRange: '$1,500-$3,000', description: 'Upgrade electrical panel' },
    { name: 'Lighting Installation', priceRange: '$100-$500', description: 'Install new lighting fixtures' },
    { name: 'Generator Installation', priceRange: '$3,000-$8,000', description: 'Backup generator installation' },
    { name: 'Emergency Electrical', priceRange: '$200-$600', description: '24/7 emergency electrical service' }
  ],

  roofing: [
    { name: 'Roof Repair', priceRange: '$300-$1,500', description: 'Fix leaks and damaged shingles' },
    { name: 'Roof Replacement', priceRange: '$8,000-$20,000', description: 'Complete roof replacement' },
    { name: 'Gutter Cleaning', priceRange: '$100-$300', description: 'Clean gutters and downspouts' },
    { name: 'Roof Inspection', priceRange: '$150-$400', description: 'Professional roof inspection' },
    { name: 'Emergency Tarping', priceRange: '$300-$800', description: 'Emergency storm damage tarping' }
  ],

  landscaping: [
    { name: 'Lawn Care', priceRange: '$50-$150/visit', description: 'Mowing, edging, and trimming' },
    { name: 'Tree Trimming', priceRange: '$200-$800', description: 'Tree and shrub trimming' },
    { name: 'Landscape Design', priceRange: '$500-$5,000', description: 'Design and installation' },
    { name: 'Seasonal Cleanup', priceRange: '$150-$500', description: 'Spring and fall cleanup' },
    { name: 'Irrigation Service', priceRange: '$100-$400', description: 'Sprinkler system service' }
  ],

  pool_service: [
    { name: 'Weekly Cleaning', priceRange: '$80-$150/week', description: 'Regular pool maintenance' },
    { name: 'Chemical Balancing', priceRange: '$50-$100', description: 'Water chemistry testing and balancing' },
    { name: 'Equipment Repair', priceRange: '$150-$500', description: 'Pump and filter repair' },
    { name: 'Pool Opening/Closing', priceRange: '$150-$400', description: 'Seasonal pool service' },
    { name: 'Green Pool Cleanup', priceRange: '$300-$800', description: 'Restore neglected pools' }
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
