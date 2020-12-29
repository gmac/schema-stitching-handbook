# frozen_string_literal: true
require_relative '../lib/base_schema'
require_relative '../lib/graphql_server'

schema = nil
type_defs = %(
  type Product @key(selectionSet: "{ upc }") {
    upc: String!
    name: String
    price: Int
    weight: Int
  }

  type Query {
    products(upcs: [ID!]!): [Product]! @merge(keyField: "upc")
    _sdl: String!
  }
)

PRODUCTS = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100,
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000,
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50,
  },
].freeze

RESOLVERS = {
  Query: {
    products: ->(obj, args, ctx) { args[:upcs].map { |upc| PRODUCTS.find { |p| p[:upc] == upc } } },
    _sdl: ->(obj, args, ctx) { schema.print_schema_with_directives }
  }
}.freeze

module DefaultResolver
  def self.call(type, field, obj, args, ctx)
    type_name = type.graphql_name
    field_name = field.name
    resolver = RESOLVERS.dig(type_name.to_sym, field_name.to_sym)

    if resolver
      resolver.call(obj, args, ctx)
    elsif obj.is_a?(Hash)
      obj[field_name] || obj[field_name.to_sym]
    end
  end
end

schema = GraphQL::SchemaDirectives.from_definition(type_defs, default_resolve: DefaultResolver)
schema.directive(MergeDirective)
schema.directive(KeyDirective)
schema.directive(ComputedDirective)

GraphQLServer.run(schema, Port: 4002)