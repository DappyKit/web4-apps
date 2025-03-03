import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('templates', (table: Knex.CreateTableBuilder) => {
    table.increments('id').primary()
    table.string('title', 255).notNullable()
    table.text('description')
    table.string('url', 2048).notNullable()
    table.text('json_data').notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
    table.string('owner_address', 42).notNullable()

    // Add indexes
    table.index('owner_address')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('templates')
}
