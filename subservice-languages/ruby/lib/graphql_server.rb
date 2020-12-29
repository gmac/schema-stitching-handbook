# frozen_string_literal: true

require 'webrick'
require 'rack'
require 'json'

class GraphQLServer
  def self.run(schema, options = {})
    Rack::Handler::WEBrick.run(GraphQLServer.new(schema), options)
  end

  attr_reader :schema

  def initialize(schema)
    @schema = schema
  end

  def call(env)
    req = Rack::Request.new(env)
    req_vars = JSON.parse(req.body.read)
    result = schema.execute(
      req_vars['query'],
      operation_name: req_vars['operationName'],
      variables: req_vars['variables'] || {},
    )
    ['200', { 'Content-Type' => 'application/json' }, [JSON.dump(result.to_h)]]
  end
end
