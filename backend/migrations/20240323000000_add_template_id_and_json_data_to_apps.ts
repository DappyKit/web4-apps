import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apps', (table) => {
    // Add template_id as a foreign key to templates
    table.integer('template_id').unsigned().references('id').inTable('templates').notNullable()

    // Add json_data field to store custom data
    table.text('json_data')

    // Add index on template_id for faster lookups
    table.index('template_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apps', (table) => {
    table.dropColumn('json_data')
    table.dropForeign(['template_id'])
    table.dropColumn('template_id')
  })
}
