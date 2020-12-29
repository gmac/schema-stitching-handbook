# frozen_string_literal: true
require_relative '../lib/base_schema'
require_relative '../lib/graphql_server'

USERS = [
  {
    id: '1',
    name: 'Ada Lovelace',
    username: '@ada',
  },
  {
    id: '2',
    name: 'Alan Turing',
    username: '@complete',
  },
].freeze

class User < BaseObject
  add_directive :key, { selectionSet: '{ id }' }
  field :id, ID, null: false
  field :name, String, null: true
  field :username, String, null: true
end

class Query < BaseObject
  field :users, [User, null: true], null: false, directives: { merge: { keyField: 'id' } } do
    argument :ids, [ID], required: true
  end
  field :_sdl, String, null: false

  def users(ids:)
    USERS.select { |u| ids.include?(u[:id]) }
  end

  def _sdl
    AccountSchema.print_schema_with_directives
  end
end

class AccountSchema < BaseSchema
  query(Query)
end

GraphQLServer.run(AccountSchema, Port: 4001)