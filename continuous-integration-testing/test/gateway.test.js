const { queryMockedGateway } = require('./test_helper');

describe('gateway schema', () => {

  const USER_QUERY = `{
    user(id: "1") {
      # id << must work without this selected
      name
      username
      reviews {
        # id << must work without this selected
        body
        product {
          # upc << must work without this selected
          name
          price
          weight
        }
      }
    }
  }`;

  test('resolves users -> reviews -> products', async () => {
    const { data } = await queryMockedGateway(USER_QUERY);

    expect(data).toEqual({
      user: {
        name: 'users-value',
        username: 'hansolo',
        reviews: [{
          body: 'great',
          product: {
            name: 'gizmo',
            price: 23,
            weight: 23,
          }
        }]
      }
    });
  });


  const REVIEW_QUERY = `{
    review(id: "1") {
      # id << must work without this selected
      body
      author {
        # id << must work without this selected
        name
        username
      }
      product {
        # upc << must work without this selected
        name
        price
        weight
      }
    }
  }`;

  test('resolves review -> author + product', async () => {
    const { data } = await queryMockedGateway(REVIEW_QUERY);

    expect(data).toEqual({
      review: {
        body: 'great',
        author: {
          name: 'users-value',
          username: 'hansolo',
        },
        product: {
          name: 'gizmo',
          price: 23,
          weight: 23,
        }
      }
    });
  });


  const PRODUCTS_QUERY = `{
    products(upcs: ["2"]) {
      # upc << must work without this selected
      name
      price
      weight
      reviews {
        # id << must work without this selected
        body
        author {
          # id << must work without this selected
          name
          username
        }
      }
    }
  }`;

  test('resolves products -> reviews -> user', async () => {
    const { data } = await queryMockedGateway(PRODUCTS_QUERY);

    expect(data).toEqual({
      products: [{
        name: 'widget',
        price: 23,
        weight: 23,
        reviews: [{
          body: 'awful',
          author: {
            name: 'users-value',
            username: 'yoda',
          }
        }]
      }]
    });
  });

});
