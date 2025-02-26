import { Knex } from 'knex'
import { ethers } from 'ethers'

/**
 * Creates test data for the database
 * @param {Knex} knex - The Knex instance
 * @returns {Promise<void>}
 */
export async function seed(knex: Knex): Promise<void> {
  // Clean existing entries
  await knex('apps').del()
  await knex('templates').del()
  await knex('users').del()

  // Create 10 users (1 specific + 9 random)
  const users = [
    '0x980F5aC0Fe183479B87f78E7892f8002fB9D5401',
    ...Array(9).fill(null).map(() => ethers.Wallet.createRandom().address)
  ]

  // Insert users
  await Promise.all(users.map(address => 
    knex('users').insert({
      address: address.toLowerCase(),
      created_at: new Date(),
      updated_at: new Date()
    })
  ))

  // Create templates for each user
  for (const userAddress of users) {
    const templates = Array(5).fill(null).map((_, index) => ({
      title: `Template ${index + 1} by ${userAddress.slice(0, 6)}`,
      description: `A test template ${index + 1} created by ${userAddress}`,
      owner_address: userAddress.toLowerCase(),
      url: `https://example.com/templates/${userAddress.toLowerCase()}/${index + 1}`,
      json_data: JSON.stringify({
        version: '1.0',
        components: ['component1', 'component2'],
        settings: { theme: 'light', language: 'en' }
      }),
      created_at: new Date(),
      updated_at: new Date()
    }))

    // Insert templates and get their IDs
    const insertedTemplates = await Promise.all(
      templates.map(template => 
        knex('templates')
          .insert(template)
          .then(() => knex('templates')
            .where({
              owner_address: template.owner_address,
              title: template.title
            })
            .first('id')
          )
      )
    )

    // Create apps for each user
    const apps = Array(3).fill(null).map((_, index) => ({
      name: `App ${index + 1} by ${userAddress.slice(0, 6)}`,
      description: `A test app ${index + 1} created by ${userAddress}`,
      owner_address: userAddress.toLowerCase(),
      template_id: insertedTemplates[index % 5].id, // Cycle through templates
      json_data: JSON.stringify({
        version: '1.0',
        settings: {
          theme: index % 2 === 0 ? 'light' : 'dark',
          features: ['feature1', 'feature2']
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    }))

    await knex('apps').insert(apps)
  }
} 