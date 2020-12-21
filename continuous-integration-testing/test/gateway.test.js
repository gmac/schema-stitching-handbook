const { queryMockedGateway } = require('./test_helper');

describe('gateway schema', () => {

  const USER_QUERY = `{
    user(id: "1") {
      name
      username
      reviews {
        body
        product {
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
      body
      author {
        name
        username
      }
      product {
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
      name
      price
      weight
      reviews {
        body
        author {
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
