# gridsome-source-shopify

> Shopify source plugin for Gridsome

This plugin also support the Storefront API's `transformedSrc` image field. You can create different image sizes and scales with this - for example, creating a thumbnail image.

## Usage

`gridsome.config.js`
```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-shopify',
      options: {
        storeName: <my-store> // OR
        storeUrl: 'https://<my-store>.myshopify.com',
        storefrontToken: <storefront-api-token>, //Required
        typeName: 'Shopify' // Optional, default is 'Shopify'
        types: [ 'Product', 'Collection' ], // Optional, default is all types
        perPage: 100 // Optional, default is 100
      }
    }
  ]
}
```

## Routes & Templates

Now you can create a template called `ShopifyProduct.vue`, and specify the route for it - Gridsome will automatically generate pages for all products.

`gridsome.config.js`
```js
module.exports = {
  templates: {
      ShopifyProduct: '/product/:handle'
  }
}
```

You can also specify templates to use if you do not want to name the template files `Shopify<type>`, or if you want to change the page routes:

`gridsome.config.js`
```js
module.exports = {
  templates: {
      ShopifyProduct: [
        {
          path: '/product/:handle',
          component: './src/templates/Product.vue'
        }
      ],
      ShopifyCollection: [
        {
          path: '/collection/:handle',
          component: './src/templates/Collection.vue'
        }
      ]
    },
  }
  ```

## Page Query

Once you have specified the route for a type, you can query it by ID.

```vue
<page-query>
query Product ($id: ID!) {
  shopifyProduct (id: $id) {
    id
    descriptionHtml
    title
  }
}
</page-query>
```

Now this product will be available at `this.$page.shopifyProduct`:
```vue
<template>
  <Layout>
    <h1>{{ $page.shopifyProduct.title }}</h3>
    <div v-html="$page.shopifyProduct.descriptionHtml" />
  </Layout>
</template>
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
