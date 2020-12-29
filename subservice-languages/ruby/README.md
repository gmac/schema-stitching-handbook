# Ruby subservices

This example demonstrates Ruby subservices within a stitched schema. Their GraphQL implementations use:

- [graphql-ruby](https://github.com/rmosolgo/graphql-ruby) for GraphQL execution.
- [graphql-ruby-schema-directives](https://github.com/gmac/graphql-ruby-schema-directives) for class-based schema directives.
- `GraphQL::Schema.from_definition` for parsing SDL strings into executable schemas.

## Setup

```shell
cd subservice-languages/ruby
bundle install

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

## Summary

Try fetching some data:

```graphql
query {
  users(ids: ["1", "2"]) {
    id
    name
    username
    reviews {
      body
      product {
        name
      }
    }
  }
}
```

Unique to this example is that the subservices are Ruby applications. Their GraphQL implementations use [graphql-ruby](https://github.com/rmosolgo/graphql-ruby) paired with [graphql-ruby-schema-directives](https://github.com/gmac/graphql-ruby-schema-directives) to generate schema stitching SDLs.

This example demonstrates both schemas built with a code-first approach (as Ruby classes), and by parsing a type definitions string into a schema. Either approach works fine for providing an annotated SDL to schema stitching.

### Class-based schemas

The Accounts and Review services are implemented using class-based schema definitions:

```ruby
class BaseField < GraphQL::Schema::Field
  include GraphQL::SchemaDirectives::Field
end

class BaseObject < GraphQL::Schema::Object
  include GraphQL::SchemaDirectives::Object
  field_class BaseField
end

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
end
```

The `GraphQL::SchemaDirectives` gem provides API extensions for applying custom schema directives to types and fields.

### Schemas from type definitions

The Products service is implemented with a parsed type definitions string:

```ruby
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

schema = GraphQL::SchemaDirectives.from_definition(type_defs, default_resolve: ...)
```

You'll need to build your own default resolver for this approach. It's more of a self-service effort, although you remain in control of the complete resolution process.
