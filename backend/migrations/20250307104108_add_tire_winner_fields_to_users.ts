import type { Knex } from 'knex'

/**
 * Migration to add tier winner fields to users table
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.boolean('tier_1_winner').defaultTo(false)
    table.boolean('tier_2_winner').defaultTo(false)
  })
}

/**
 * Rollback function to remove the added fields
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('tier_1_winner')
    table.dropColumn('tier_2_winner')
  })
}
