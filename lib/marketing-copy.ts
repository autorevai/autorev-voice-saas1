// Marketing copy for trial limits: 10 calls OR 25 minutes

export const TRIAL_COPY = {
  hero: {
    headline: 'Try it free - 10 calls included',
    subheadline: 'No credit card • 14 days • Full features',
  },

  features: [
    '14-day free trial',
    '10 test calls OR 25 minutes',
    'No credit card required',
    'Cancel anytime',
  ],

  onboarding: {
    success: {
      title: '🎉 Your AI Receptionist is Ready!',
      message: 'You have 10 free calls to test your assistant.',
      cta: 'Make a test call now',
    },
  },

  dashboard: {
    banner: {
      active: (callsRemaining: number, minutesRemaining: number) =>
        `📞 Trial Status: ${callsRemaining} of 10 calls remaining • ${minutesRemaining} of 25 minutes remaining`,
      urgent: (limitType: 'calls' | 'minutes') =>
        `⚠️ Running low on trial ${limitType}! Upgrade to unlimited calls.`,
      exceeded: 'Trial Complete - Upgrade to continue receiving calls',
    },
  },

  pricing: {
    trial: {
      title: '✨ Start Your Free Trial',
      features: [
        '14 days free - no credit card required',
        '10 test calls included',
        'Up to 25 minutes total',
        'Full AI receptionist features',
        'Cancel anytime',
      ],
    },
  },

  emails: {
    halfway: {
      subject: 'Halfway through your trial! 🎉',
      preview: 'You\'ve made 5 test calls - here\'s what we learned',
    },
    warning: {
      subject: '⚠️ Only 2 calls left in your trial',
      preview: 'Your trial is almost over - upgrade to continue',
    },
    ended: {
      subject: 'Your trial has ended',
      preview: 'Upgrade to continue receiving calls',
    },
  },
} as const

export const getPricingCopy = (planTier: 'starter' | 'growth' | 'pro') => {
  const plans = {
    starter: {
      name: 'Starter',
      price: '$399/month',
      minutes: '500 minutes included',
      description: 'Perfect for small businesses getting started',
    },
    growth: {
      name: 'Growth',
      price: '$999/month',
      minutes: '1,500 minutes included',
      description: 'For growing businesses with higher call volume',
    },
    pro: {
      name: 'Pro',
      price: '$2,499/month',
      minutes: '5,000 minutes included',
      description: 'For established businesses with high call volume',
    },
  }

  return plans[planTier]
}
