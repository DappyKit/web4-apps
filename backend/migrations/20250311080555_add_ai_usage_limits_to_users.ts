import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    // Track daily AI usage count
    table.integer('ai_usage_count').defaultTo(0).notNullable()
    // Store the last reset date for the AI usage count
    table.date('ai_usage_reset_date').nullable()
    // Store the last generated challenge for AI usage
    table.string('ai_challenge_uuid', 36).nullable()
    // Store the timestamp when the challenge was generated
    table.timestamp('ai_challenge_created_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('ai_usage_count')
    table.dropColumn('ai_usage_reset_date')
    table.dropColumn('ai_challenge_uuid')
    table.dropColumn('ai_challenge_created_at')
  })
}
