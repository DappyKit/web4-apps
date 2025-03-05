import { Knex } from 'knex'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from '../../knexfile'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

dotenv.config()

/**
 * Test database utility functions for managing database connections, migrations,
 * and test accounts in a consistent way across all tests.
 */
export class TestDb {
  private db: Knex
  private testAccount: PrivateKeyAccount | null = null
  private otherAccount: PrivateKeyAccount | null = null
  private walletClient: ReturnType<typeof createWalletClient> | null = null
  private otherWalletClient: ReturnType<typeof createWalletClient> | null = null

  /**
   * Creates a new TestDb instance with a connection to the development database
   */
  constructor() {
    this.db = knex(knexConfig['development'])
  }

  /**
   * Initializes test accounts for use in test cases
   * @returns Object containing test accounts and wallet clients
   */
  public initTestAccounts(): {
    testAccount: PrivateKeyAccount
    otherAccount: PrivateKeyAccount
    walletClient: ReturnType<typeof createWalletClient>
    otherWalletClient: ReturnType<typeof createWalletClient>
  } {
    const testPrivateKey = generatePrivateKey()
    const otherPrivateKey = generatePrivateKey()
    this.testAccount = privateKeyToAccount(testPrivateKey)
    this.otherAccount = privateKeyToAccount(otherPrivateKey)

    this.walletClient = createWalletClient({
      account: this.testAccount,
      chain: mainnet,
      transport: http(),
    })

    this.otherWalletClient = createWalletClient({
      account: this.otherAccount,
      chain: mainnet,
      transport: http(),
    })

    return {
      testAccount: this.testAccount,
      otherAccount: this.otherAccount,
      walletClient: this.walletClient,
      otherWalletClient: this.otherWalletClient,
    }
  }

  /**
   * Gets the database instance
   * @returns Knex database instance
   */
  public getDb(): Knex {
    return this.db
  }

  /**
   * Creates a mock database that throws an error for a specific operation
   * @param errorType - The type of error to simulate
   * @returns A mocked Knex instance
   */
  public createMockDbWithError(errorType: 'simple' | 'nested' | 'complex'): Knex {
    if (errorType === 'simple') {
      // Simple error - throws on any where() call
      return {
        ...this.db,
        async where(): Promise<never> {
          throw new Error('Database error')
        },
      } as unknown as Knex
    } else if (errorType === 'nested') {
      // Nested error - throws after a chain of calls
      return {
        ...this.db,
        where(): Record<string, unknown> {
          return {
            async first(): Promise<never> {
              throw new Error('Database error')
            },
          }
        },
      } as unknown as Knex
    } else {
      // Complex error - throws after a longer chain of calls (pagination)
      return {
        ...this.db,
        where(): Record<string, unknown> {
          return {
            orderBy(): Record<string, unknown> {
              return {
                limit(): Record<string, unknown> {
                  return {
                    offset(): never {
                      throw new Error('Database error')
                    },
                  }
                },
              }
            },
            count(): Record<string, unknown> {
              return {
                first(): never {
                  throw new Error('Database error')
                },
              }
            },
          }
        },
      } as unknown as Knex
    }
  }

  /**
   * Gets the primary test account
   * @returns The primary test account
   */
  public getTestAccount(): PrivateKeyAccount {
    if (!this.testAccount) {
      throw new Error('Test account not initialized. Call initTestAccounts first.')
    }
    return this.testAccount
  }

  /**
   * Gets the secondary test account
   * @returns The secondary test account
   */
  public getOtherAccount(): PrivateKeyAccount {
    if (!this.otherAccount) {
      throw new Error('Other account not initialized. Call initTestAccounts first.')
    }
    return this.otherAccount
  }

  /**
   * Gets the wallet client for the primary test account
   * @returns The wallet client
   */
  public getWalletClient(): ReturnType<typeof createWalletClient> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Call initTestAccounts first.')
    }
    return this.walletClient
  }

  /**
   * Gets the wallet client for the secondary test account
   * @returns The other wallet client
   */
  public getOtherWalletClient(): ReturnType<typeof createWalletClient> {
    if (!this.otherWalletClient) {
      throw new Error('Other wallet client not initialized. Call initTestAccounts first.')
    }
    return this.otherWalletClient
  }

  /**
   * Runs database migration before each test
   * @param createUsers - Whether to create test users in the database
   * @returns Promise that resolves when migrations are complete
   */
  public async setupTestDb(createUsers = true): Promise<void> {
    try {
      // Rollback and migrate
      await this.db.migrate.rollback()
      await this.db.migrate.latest()

      // Create test users if requested
      if (createUsers && this.testAccount && this.otherAccount) {
        await this.db('users').insert([
          {
            address: this.testAccount.address,
          },
          {
            address: this.otherAccount.address,
          },
        ])
      }
    } catch (error: unknown) {
      console.error('Test DB setup failed:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Rolls back migrations after each test
   * @returns Promise that resolves when rollback is complete
   */
  public async teardownTestDb(): Promise<void> {
    try {
      await this.db.migrate.rollback()
    } catch (error: unknown) {
      console.error('Test DB teardown failed:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Closes the database connection
   * @returns Promise that resolves when the connection is closed
   */
  public async closeConnection(): Promise<void> {
    await this.db.destroy()
  }
}

/**
 * Creates a test database instance with preset accounts and migrations
 * @returns A configured TestDb instance
 */
export async function setupTestDatabase(): Promise<TestDb> {
  const testDb = new TestDb()
  testDb.initTestAccounts()
  await testDb.setupTestDb()
  return testDb
}
