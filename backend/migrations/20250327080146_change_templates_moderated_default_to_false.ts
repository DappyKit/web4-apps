import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.boolean('moderated').notNullable().defaultTo(false).alter()
  })

  // Update existing templates to not be moderated
  await knex('templates').update({ moderated: false })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('templates', table => {
    table.boolean('moderated').notNullable().defaultTo(true).alter()
  })
}
