# frozen_string_literal: true
require_relative '../lib/base_schema'
require_relative '../lib/graphql_server'

REVIEWS = [
  {
    id: '1',
    authorId: '1',
    productUpc: '1',
    body: 'Love it!',
  },
  {
    id: '2',
    authorId: '1',
    productUpc: '2',
    body: 'Too expensive.',
  },
  {
    id: '3',
    authorId: '2',
    productUpc: '3',
    body: 'Could be better.',
  },
  {
    id: '4',
    authorId: '2',
    productUpc: '1',
    body: 'Prefer something else.',
  },
].freeze

class Review < BaseObject
  add_directive :key, { selectionSet: '{ id }' }

  field :id, ID, null: false
  field :body, String, null: true
  field :author, 'User', null: true
  field :product, 'Product', null: true

  def author
    { id: object[:authorId] }
  end

  def product
    { upc: object[:productUpc] }
  end
end

class User < BaseObject
  add_directive :key, { selectionSet: '{ id }' }

  field :id, ID, null: false
  field :reviews, [Review], null: true

  def reviews
    REVIEWS.select { |review| review[:authorId] == object[:id] }
  end
end

class Product < BaseObject
  add_directive :key, { selectionSet: '{ upc }' }

  field :upc, String, null: false
  field :reviews, [Review], null: true

  def reviews
    REVIEWS.select { |review| review[:productUpc] == object[:upc] }
  end
end

class Query < BaseObject
  field :_users, [User, null: true], null: false, directives: { merge: { keyField: 'id' } } do
    argument :ids, [ID], required: true
  end
  field :_products, [Product, null: true], null: false, directives: { merge: { keyField: 'upc' } } do
    argument :upcs, [ID], required: true
  end
  field :_sdl, String, null: false

  def _users(ids:)
    ids.map { |id| { id: id } }
  end

  def _products(upcs:)
    upcs.map { |upc| { upc: upc } }
  end

  def _sdl
    ReviewSchema.print_schema_with_directives
  end
end

class ReviewSchema < BaseSchema
  query(Query)
end

GraphQLServer.run(ReviewSchema, Port: 4003)
