import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from '../knexfile'
import path from 'path'

// Determine if we're running from dist or directly from src
const isDist = __dirname.includes('dist')
const envPath = isDist ? path.resolve(__dirname, '../../../.env') : path.resolve(__dirname, '../../.env')

// Load environment variables
dotenv.config({ path: envPath })

/**
 * Type for the raw database result
 */
type DbCreator = {
  address: string
  app_count: string | number
}

/**
 * Fetches and displays the top 200 creators with their full addresses and app counts
 */
async function showWinners(): Promise<void> {
  // Initialize database connection
  const db = knex(knexConfig[process.env.NODE_ENV || 'development'])

  try {
    console.log('Fetching top creators data from database...\n')

    // Get all users with app counts - same query as in the /with-app-counts API
    const EXCLUDED_ADDRESSES = ['0x980F5aC0Fe183479B87f78E7892f8002fB9D5401']
    const lowercasedExcludedAddresses = EXCLUDED_ADDRESSES.map(addr => addr.toLowerCase())

    let query = db('users')
      .select('users.address')
      .count('apps.id as app_count')
      .join('apps', 'users.address', 'apps.owner_address')
      .where('apps.moderated', true) // Only count moderated apps
      .groupBy('users.address')
      .having(db.raw('count(apps.id) >= 1'))
      .orderBy('app_count', 'desc')
      .limit(200)

    // Add an exclusion for each address
    lowercasedExcludedAddresses.forEach(address => {
      query = query.whereRaw('LOWER(users.address) != ?', [address])
    })

    const winners = await query

    if (winners.length === 0) {
      console.log('No creators found.')
      return
    }

    console.log(`Found ${winners.length} top creators:\n`)

    // Display each creator with their full address and app count
    winners.forEach(winner => {
      const creatorData = winner as DbCreator
      console.log(`${creatorData.address} 50`)
    })

    console.log(`\nTotal creators displayed: ${winners.length}`)

    // Get all moderated templates
    console.log('\n' + '='.repeat(50))
    console.log('MODERATED TEMPLATES')
    console.log('='.repeat(50) + '\n')

    const templates = await db('templates')
      .select('owner_address', 'title')
      .where('moderated', true)
      .orderBy('title', 'asc')

    if (templates.length === 0) {
      console.log('No moderated templates found.')
    } else {
      console.log(`Found ${templates.length} moderated templates:\n`)

      templates.forEach(template => {
        const templateData = template as { owner_address: string; title: string }
        console.log(`${templateData.owner_address} "${templateData.title}"`)
      })

      console.log(`\nTotal moderated templates displayed: ${templates.length}`)
    }
  } catch (error: unknown) {
    console.error('Error fetching creators:', error)
    process.exit(1)
  } finally {
    // Close database connection
    await db.destroy()
  }
}

// Run the script if called directly
if (require.main === module) {
  showWinners()
    .then(() => {
      console.log('\nTop creators data displayed successfully!')
      process.exit(0)
    })
    .catch((error: unknown) => {
      console.error('Script execution failed:', error)
      process.exit(1)
    })
}

export { showWinners }
