import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.boolean('moderated').notNullable().defaultTo(true)
  })

  // Set all existing templates as moderated
  await knex('templates').update({ moderated: true })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.dropColumn('moderated')
  })
}
