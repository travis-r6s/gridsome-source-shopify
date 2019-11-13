# gridsome-source-shopify

> Shopify source plugin for Gridsome

This plugin also support the Storefront API's `transformedSrc` image field. You can create different image size and scales with this, for example creating a thumbnail image.

## Usage

```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-shopify',
      options: {
        storeName: 'my-store' // OR
        storeUrl: 'https://<my-store>.myshopify.com',
        storefrontToken: <storefront api token>, //Required
        typeName: 'Shopify' // Optional, default is 'Shopify'
        types: [ 'Product', 'Collection' ], // Optional, default is all types
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
        handle
        descriptionHtml
        image {
          originalSrc
          thumbnail: transformedSrc(maxWidth: 100, maxHeight: 100, crop: CENTER)
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

### Product's Variants

### Products

```graphql
{
  allShopifyProduct {
    edges {
      node {
        id
        variants {
          title
          image {
            id
            altText
            originalSrc
          }
          price {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
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
        image {
          id
          altText
          banner: transformedSrc(maxHeight: 400, crop: BOTTOM, scale: 2)
        }
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

### Articles

```graphql
{
  allShopifyArticle (limit: 10) {
    edges {
      node {
        id
        title
        publishedAt
        author {
          name
        }
        blog {
          id
          title
        }
        contentHtml
        excerptHtml
        image {
          id
          altText
          originalSrc
        }
      }
    }
  }
}
```

### Pages

```graphql
{
  allShopifyPage {
    edges {
      node {
        id
        title
        handle
        bodySummary
        body
      }
    }
  }
}
```
