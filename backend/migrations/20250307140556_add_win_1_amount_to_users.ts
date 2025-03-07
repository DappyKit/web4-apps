import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.string('win_1_amount').nullable()
    table.index('win_1_amount')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('win_1_amount')
  })
}
