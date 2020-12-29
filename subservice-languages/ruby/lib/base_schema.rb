require 'graphql'
require 'graphql-schema_directives'

# Stitching directive definitions

class MergeDirective < GraphQL::Schema::Directive
  graphql_name 'merge'
  add_argument GraphQL::Schema::Argument.new('keyField', String, required: false, owner: GraphQL::Schema)
  add_argument GraphQL::Schema::Argument.new('keyArg', String, required: false, owner: GraphQL::Schema)
  add_argument GraphQL::Schema::Argument.new('additionalArgs', String, required: false, owner: GraphQL::Schema)
  add_argument GraphQL::Schema::Argument.new('key', [String], required: false, owner: GraphQL::Schema)
  add_argument GraphQL::Schema::Argument.new('argsExpr', String, required: false, owner: GraphQL::Schema)
  locations 'FIELD_DEFINITION'
end

class KeyDirective < GraphQL::Schema::Directive
  graphql_name 'key'
  add_argument GraphQL::Schema::Argument.new('selectionSet', String, required: true, owner: GraphQL::Schema)
  locations 'OBJECT'
end

class ComputedDirective < GraphQL::Schema::Directive
  graphql_name 'computed'
  add_argument GraphQL::Schema::Argument.new('selectionSet', String, required: true, owner: GraphQL::Schema)
  locations 'FIELD_DEFINITION'
end

# GraphQL base types with schema directives

class BaseField < GraphQL::Schema::Field
  include GraphQL::SchemaDirectives::Field
end

class BaseObject < GraphQL::Schema::Object
  include GraphQL::SchemaDirectives::Object
  field_class BaseField
end

class BaseSchema < GraphQL::Schema
  include GraphQL::SchemaDirectives::Schema
  directive(MergeDirective)
  directive(KeyDirective)
  directive(ComputedDirective)
end