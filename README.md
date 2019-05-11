# gridsome-source-shopify

> Shopify source plugin for Gridsome

## Usage

```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-shopify',
      options: {
        storeUrl: process.env.SHOPIFY_URL, // Required
        storefrontToken: process.env.SHOPIFY_TOKEN, //Required
        typeName: 'Shopify' // Optional, default is 'Shopify'
        types: [ // Optional, default is all types
          'Product'
        ],
        perPage: 100 // Optional, default is 100
      }
    }
  ]
}
```

## Example Queries

### Products

```graphql
{
  allShopifyProduct {
    edges {
      node {
        id
        title
        descriptionHtml
        image {
          originalSrc
        }
        collections {
          title
          slug
        }
        tags
        productType
      }
    }
  }
}
```

### Collections

```graphql
{
  allShopifyCollection {
    edges {
      node {
        id
        title
        slug
        descriptionHtml
        products {
          id
          title
          slug
        }
      }
    }
  }
}
```
