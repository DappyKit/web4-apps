import { Knex } from 'knex'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

/**
 * Quiz question interface
 */
interface QuizQuestion {
  text: string
  options: string[]
}

/**
 * Quiz data interface
 */
interface QuizData {
  name: string
  description: string
  questions: QuizQuestion[]
}

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
    ...Array(9)
      .fill(null)
      .map(() => {
        const privateKey = generatePrivateKey()
        const account = privateKeyToAccount(privateKey)
        return account.address
      }),
  ]

  // Insert users
  await Promise.all(
    users.map(address =>
      knex('users').insert({
        address: address.toLowerCase(),
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ),
  )

  /**
   * Ensure a string is within the required length constraints (3-20 chars)
   * @param {string} str - Input string
   * @param {string} defaultStr - Default if too short
   * @returns {string} Properly sized string
   */
  const enforceLength = (str: string, defaultStr: string = 'Default Text'): string => {
    if (str.length < 3) return defaultStr
    return str.length > 20 ? str.substring(0, 20) : str
  }

  /**
   * Generate a template using the quiz schema from the repository
   * @param {number} index - Index for generating unique content
   * @param {string} userAddress - Owner address
   * @returns {Object} Template data
   */
  const generateQuizTemplate = (index: number, userAddress: string): Record<string, unknown> => {
    const quizTopics = ['Web3', 'NFTs', 'DeFi', 'DAOs', 'Crypto', 'Tokens', 'Mining', 'Wallet', 'Smart', 'Chain']

    const topic = quizTopics[index % quizTopics.length]

    // The schema definition for quiz templates
    const schemaDefinition = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 3,
          maxLength: 20,
        },
        description: {
          type: 'string',
          minLength: 3,
          maxLength: 20,
        },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                minLength: 3,
                maxLength: 20,
              },
              options: {
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 3,
                  maxLength: 20,
                },
                minItems: 4,
                maxItems: 4,
              },
            },
            required: ['text', 'options'],
          },
        },
      },
      required: ['name', 'description', 'questions'],
    }

    return {
      title: `${topic} Quiz ${index + 1}`,
      description: `A quiz about ${topic}`,
      owner_address: userAddress.toLowerCase(),
      url: `https://example.com/templates/${userAddress.toLowerCase()}/${index + 1}`,
      // Store the schema definition as requested
      json_data: JSON.stringify(schemaDefinition),
      moderated: true,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    }
  }

  // Create templates for each user
  for (const userAddress of users) {
    const templates = Array(100)
      .fill(null)
      .map((_, index) => generateQuizTemplate(index, userAddress))

    // Insert templates and get their IDs
    const insertedTemplates = await Promise.all(
      templates.map(template =>
        knex('templates')
          .insert(template)
          .then(() =>
            knex('templates')
              .where({
                owner_address: template.owner_address,
                title: template.title,
              })
              .first('id'),
          ),
      ),
    )

    /**
     * Generate an app based on a quiz template
     * @param {number} index - Index for generating unique content
     * @param {string} userAddress - Owner address
     * @param {number} templateId - ID of the associated template
     * @returns {Object} App data
     */
    const generateQuizApp = (index: number, userAddress: string, templateId: number): Record<string, unknown> => {
      // We don't need to parse the template JSON since it's just a schema definition

      const quizTopics = ['Web3', 'NFTs', 'DeFi', 'DAOs', 'Crypto', 'Tokens', 'Mining', 'Wallet', 'Smart', 'Chain']
      const topic = quizTopics[index % quizTopics.length]

      // Create app-specific data that follows the same schema structure
      const quizAppData: QuizData = {
        name: enforceLength(`${topic} Quiz App${index + 1}`),
        description: enforceLength(`About ${topic}`),
        questions: [
          {
            text: enforceLength(`${topic} Q1`),
            options: [
              enforceLength('Answer A'),
              enforceLength('Answer B'),
              enforceLength('Answer C'),
              enforceLength('Answer D'),
            ],
          },
          {
            text: enforceLength(`${topic} Q2`),
            options: [
              enforceLength('Option 1'),
              enforceLength('Option 2'),
              enforceLength('Option 3'),
              enforceLength('Option 4'),
            ],
          },
          {
            text: enforceLength(`${topic} Q3`),
            options: [
              enforceLength('Choice A'),
              enforceLength('Choice B'),
              enforceLength('Choice C'),
              enforceLength('Choice D'),
            ],
          },
        ],
      }

      return {
        name: quizAppData.name.substring(0, 50),
        description: `Quiz about ${topic}`.substring(0, 200),
        owner_address: userAddress.toLowerCase(),
        template_id: templateId,
        json_data: JSON.stringify(quizAppData), // Direct data format like quiz-correct.json
        moderated: true,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      }
    }

    // Create apps for each user
    const apps = Array(100)
      .fill(null)
      .map((_, index) => generateQuizApp(index, userAddress, insertedTemplates[index % templates.length].id as number))

    await knex('apps').insert(apps)
  }
}
