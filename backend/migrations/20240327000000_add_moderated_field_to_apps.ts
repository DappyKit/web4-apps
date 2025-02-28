import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('apps', table => {
    table.boolean('moderated').notNullable().defaultTo(false)
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('apps', table => {
    table.dropColumn('moderated')
  })
}
