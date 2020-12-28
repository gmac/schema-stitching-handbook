import "reflect-metadata";
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { GraphQLResolveInfo, specifiedDirectives } from 'graphql';
import { Arg, buildSchema, Directive, /* Extensions, */ Field, ID, Info, Int, ObjectType, Query, Resolver } from 'type-graphql';
import * as NotFoundError from '../../lib/not_found_error';

const { allStitchingDirectives, stitchingDirectivesValidator } = stitchingDirectives();

const products = [
  { upc: '1', name: 'Table', price: 899, weight: 100 },
  { upc: '2', name: 'Couch', price: 1299, weight: 1000 },
  { upc: '3', name: 'Chair', price: 54, weight: 50 },
];

@Directive(`@key(selectionSet: "{ upc }")`)
// Or:
// @Extensions({ directives: { key: { selectionSet : '{ upc }' } } })
@ObjectType()
class Product {
  @Field(type => ID)
  upc: string;

  @Field()
  name: string;

  @Field(type => Int)
  price: number;

  @Field(type => Int)
  weight: number;
}

@Resolver()
class ProductResolver {
  @Query(returns => [Product])
  topProducts(
    @Arg("first", type => Int, { defaultValue: 2 }) first: number,
  ) {
    return products.slice(0, first);
  }

  @Directive(`@merge(keyField: "upc")`)
  // Or: @Extensions({ directives: { merge: { keyField : 'upc' } } })
  @Query(returns => [Product])
  products(
    @Arg("upcs", type => [ID]) upcs: Array<string>,
  ) {
    return upcs.map((upc) => products.find(product => product.upc === upc) || new NotFoundError());
  }

  @Query(returns => String)
  _sdl(
    @Info() info: GraphQLResolveInfo,
  ) {
    return printSchemaWithDirectives(info.schema);
  }
}

const productsSchema = buildSchema({
  resolvers: [ProductResolver],
  directives: [...specifiedDirectives, ...allStitchingDirectives],
});

export default productsSchema;