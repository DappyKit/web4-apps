import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.timestamp('deleted_at').nullable()
    table.index('deleted_at')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.dropColumn('deleted_at')
  })
}
