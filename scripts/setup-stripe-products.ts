// Run with: npx tsx scripts/setup-stripe-products.ts
// This will automatically create all Stripe products and update your .env files

import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const PRODUCTS = [
  {
    name: 'Starter',
    description: 'Perfect for single-location businesses',
    envKey: 'STRIPE_STARTER_PRICE_ID',
    price: 39900, // $399.00
    minutesIncluded: 500,
    features: [
      'Single phone number',
      'Basic booking + CRM writes',
      'SMS confirmations',
      '500 minutes/month',
      'Business hours support'
    ]
  },
  {
    name: 'Growth',
    description: 'Most popular for growing businesses',
    envKey: 'STRIPE_GROWTH_PRICE_ID',
    price: 89900, // $899.00
    minutesIncluded: 1500,
    features: [
      'Multi-number/brand support',
      'Missed-call rescue',
      'Text-to-pay deposits',
      'After-hours logic',
      '1,500 minutes/month',
      'Priority support'
    ],
    popular: true
  },
  {
    name: 'Pro',
    description: 'Enterprise solution for multi-location operations',
    envKey: 'STRIPE_PRO_PRICE_ID',
    price: 179900, // $1,799.00
    minutesIncluded: 5000,
    features: [
      'Multi-location',
      'Advanced routing',
      'Bilingual support (EN/ES)',
      'Analytics exports',
      'Dedicated account manager',
      '5,000 minutes/month',
      'Custom integrations'
    ]
  }
]

async function setupStripeProducts() {
  console.log('🚀 Starting Stripe Product Setup...\n')

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables')
    console.error('   Add it to .env.local and try again')
    process.exit(1)
  }

  console.log('✅ Stripe API key found\n')

  const envUpdates: Record<string, string> = {}

  for (const productData of PRODUCTS) {
    console.log(`📦 Creating product: ${productData.name}`)
    console.log(`   Price: $${(productData.price / 100).toFixed(2)}/month`)
    console.log(`   Minutes: ${productData.minutesIncluded}`)

    try {
      // Check if product already exists by name
      const existingProducts = await stripe.products.search({
        query: `name:"${productData.name} Plan"`,
        limit: 1
      })

      let product: Stripe.Product

      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0]
        console.log(`   ℹ️  Product already exists: ${product.id}`)
        
        // Update product metadata
        product = await stripe.products.update(product.id, {
          description: productData.description,
          metadata: {
            minutes_included: productData.minutesIncluded.toString(),
            features: JSON.stringify(productData.features),
            popular: productData.popular ? 'true' : 'false'
          }
        })
        console.log(`   ✅ Updated product metadata`)
      } else {
        // Create new product
        product = await stripe.products.create({
          name: `${productData.name} Plan`,
          description: productData.description,
          metadata: {
            minutes_included: productData.minutesIncluded.toString(),
            features: JSON.stringify(productData.features),
            popular: productData.popular ? 'true' : 'false'
          }
        })
        console.log(`   ✅ Created product: ${product.id}`)
      }

      // Check if price already exists for this product
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 1
      })

      let price: Stripe.Price

      if (existingPrices.data.length > 0) {
        price = existingPrices.data[0]
        console.log(`   ℹ️  Price already exists: ${price.id}`)
        
        // Verify price matches
        if (price.unit_amount !== productData.price) {
          console.log(`   ⚠️  Price mismatch! Expected $${productData.price / 100}, got $${price.unit_amount! / 100}`)
          console.log(`   Creating new price...`)
          
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: productData.price,
            currency: 'usd',
            recurring: {
              interval: 'month',
              trial_period_days: 14
            },
            metadata: {
              minutes_included: productData.minutesIncluded.toString()
            }
          })
          console.log(`   ✅ Created new price: ${price.id}`)
        }
      } else {
        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: productData.price,
          currency: 'usd',
          recurring: {
            interval: 'month',
            trial_period_days: 14
          },
          metadata: {
            minutes_included: productData.minutesIncluded.toString()
          }
        })
        console.log(`   ✅ Created price: ${price.id}`)
      }

      // Store for env file update
      envUpdates[productData.envKey] = price.id
      console.log(`   💾 ${productData.envKey}=${price.id}\n`)

    } catch (error: any) {
      console.error(`   ❌ Error creating ${productData.name}:`, error.message)
      process.exit(1)
    }
  }

  // Update .env.local file
  console.log('📝 Updating .env.local file...')
  
  const envPath = path.join(process.cwd(), '.env.local')
  let envContent = ''
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8')
  }

  // Remove existing Stripe price IDs
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('STRIPE_STARTER_PRICE_ID=') &&
                    !line.startsWith('STRIPE_GROWTH_PRICE_ID=') &&
                    !line.startsWith('STRIPE_PRO_PRICE_ID='))
    .join('\n')

  // Add new price IDs
  const newLines = Object.entries(envUpdates)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  // Add Stripe section if not exists
  if (!envContent.includes('# Stripe Price IDs')) {
    envContent += '\n\n# Stripe Price IDs (Auto-generated)\n'
  }
  
  envContent += newLines + '\n'

  fs.writeFileSync(envPath, envContent.trim() + '\n')
  console.log('✅ .env.local updated with price IDs\n')

  // Generate .env.production template
  console.log('📝 Creating .env.production template...')
  
  const prodEnvPath = path.join(process.cwd(), '.env.production.template')
  const prodEnvContent = Object.entries(envUpdates)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  fs.writeFileSync(prodEnvPath, prodEnvContent + '\n')
  console.log('✅ .env.production.template created\n')

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SETUP COMPLETE!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('📋 Summary:')
  PRODUCTS.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} Plan - $${p.price / 100}/mo`)
  })
  console.log()
  
  console.log('📌 Next Steps:')
  console.log('   1. Verify products in Stripe Dashboard:')
  console.log('      https://dashboard.stripe.com/products\n')
  console.log('   2. Add these variables to Vercel:')
  Object.entries(envUpdates).forEach(([key, value]) => {
    console.log(`      vercel env add ${key}`)
    console.log(`      # Paste: ${value}`)
  })
  console.log()
  console.log('   3. Restart your dev server:')
  console.log('      npm run dev\n')
  console.log('   4. Test the pricing page:')
  console.log('      http://localhost:3000/pricing\n')
}

// Run the setup
setupStripeProducts().catch(error => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
