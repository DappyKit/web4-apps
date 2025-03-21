import type { Knex } from 'knex'

/**
 * Migration to add GitHub integration fields to users table
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.string('github_token').nullable()
    table.string('github_username').nullable()
    table.string('github_email').nullable()
    table.string('github_name').nullable()
    table.timestamp('github_connected_at').nullable()
  })
}

/**
 * Rollback function to remove GitHub-related fields
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('github_token')
    table.dropColumn('github_username')
    table.dropColumn('github_email')
    table.dropColumn('github_name')
    table.dropColumn('github_connected_at')
  })
}
