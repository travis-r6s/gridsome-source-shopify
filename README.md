# gridsome-source-shopify

> Shopify source plugin for Gridsome

This plugin supports the Storefront API's [`transformedSrc` image field](#transformsrc), as well as [currency formatting](#amount).


1. [Install](#install)
2. [Usage](#usage)
3. [Routes & Templates](#routes--templates)
4. [Page Query](#page-query)
5. [Metafields](#metafields)
5. [Translations](#translations)
6. [Additional Resolvers](#additional-resolvers)
7. [Helpful Snippets](#helpful-snippets)

## Install
yarn:
```bash
yarn add gridsome-source-shopify
```

npm:
```bash
npm install gridsome-source-shopify
```

## Usage

`gridsome.config.js`
```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-shopify',
      options: {
        storeName: '<my-store>', // OR
        storeUrl: 'https://<my-store>.myshopify.com',
        storefrontToken: '<storefront-api-token>', //Required
        typeName: 'Shopify', // Optional, default is 'Shopify'
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
    <h1>{{ $page.shopifyProduct.title }}</h1>
    <div v-html="$page.shopifyProduct.descriptionHtml" />
  </Layout>
</template>
```

## Metafields

To make metafields available to query in the Storefront API, you should follow this guide: [Retrieve metafields with the Storefront API](https://shopify.dev/tutorials/retrieve-metafields-with-storefront-api).

## Translations

To fetch translations for relevant types, you need to an array of locales to the plugin options. This plugin will fetch the default Shopify locale by default, so this array should only include extra locales you want to fetch:
```js
options: {
  // ...
  locales: ['es', 'fr']
}
```

These translations are then available a couple of different ways, depending on how your sites internationalization is setup.

### Translatable Fields

When the locales config has been added, a `locale` argument is added to relevant fields. This can then be used to get a specific translation for that field - it fits well with when you have a site that uses a locale URL prefix, so you have different pages for each locale version. For example:

`gridsome.server.js`
```js
module.exports = api => {
  api.createPages(async ({ graphql, createPage }) => {
    const { data } = await graphql(`
      allShopifyProduct {
        edges {
          node {
            id
            handle
          }
        }
      }
    `)

    const locales = ['en', 'es', 'fr']

    for (const { node: product } of data.allShopifyProduct.edges) {
      for (const locale of locales) {
        createPage({
          path: `/${locale}/products/${product.handle}`,
          component: './src/templates/Product.vue',
          context: {
            id: product.id,
            locale
          }
        })
      }
    }
  })
}
```
`Product.vue`
```vue
<template>
  <Layout>
    <div>
      <h1>{{ product.title }}</h1>
      <div v-html="product.descriptionHtml"></div>
      <!-- ... -->
    </div>
  </Layout>
</template>

<script>
export default {
  name: 'Product',
  computed: {
    product () { return this.$page.shopifyProduct }
  }
}
</script>

<page-query>
query Product ($id: ID!, $locale: String!) {
  shopifyProduct (id: $id) {
    id
    title(locale: $locale)
    descriptionHtml(locale: $locale)
    variants {
      id
      title(locale: $locale)
      price {
        amount
      }
      selectedOptions (locale: $locale) {
        name
        value
      }
    }
  }
}
</page-query>
```

#### Translation Collections

A translations collection is added for each relevant type, each with an array of nodes containing the translatable fields for that type. You can add filters to these queries to get a specific locale if needed - for example:

```graphql
allShopifyProductTranslations (filter: { locale: {_eq: "es" }}) {
  edges {
    node {
      id
      originalId
      title
      description
      variant {
        title
      }
    }
  }
}
```
> Note: As these collections contain multiple copies of a node (for each translation), the ID is changed to keep it unique. The original Shopify ID can be found under `originalId`.

This could be used when you have a site setup so there is one page that includes every translation, and a select input is used to switch between locales:

```vue
<template>
  <Layout @locale-change="currentLocale = $event">
    <div>
      <h1>{{ translatedProduct.title }}</h1>
      <div v-html="translatedProduct.descriptionHtml"></div>
      <!-- ... -->
    </div>
  </Layout>
</template>

<script>
export default {
  name: 'Product',
  data: () => ({
    currentLocale: 'en'
  }),
  computed: {
    product () {
      return this.$page.shopifyProduct
    },
    translatedProduct () {
      const locale = this.currentLocale
      if (locale === 'en') return this.product

      const translations = this.$page.allShopifyProductTranslation.edges.map(({ node }) => node)
      return translations.find(translation => translation.locale = locale)
    }
  }
}
</script>

<page-query>
query Product ($id: ID!) {
  shopifyProduct (id: $id) {
    id
    title
    descriptionHtml
    variants {
      id
      title
      price {
        amount
      }
    }
  }
  allShopifyProductTranslation (filter: { id: { eq: $id }}) {
    edges {
      node {
        id
        title
        locale
        descriptionHtml
        variants {
          title
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
}
</page-query>
```

## Additional Resolvers

This plugin adds a couple of custom resolvers to help with image sizing, and currency formatting.

#### `transformSrc`

Each image type includes a `transformSrc` field, similar to the Shopify Storefront's. You can create different image sizes and scales with this - for example, creating a thumbnail image, and a card/cover image:

```graphql
...
  image {
    ...
    thumbnail: transformedSrc(maxWidth: 100, maxHeight: 100, crop: CENTER)
    coverImage: transformedSrc(maxWidth: 600, maxHeight: 400, crop: CENTER)
  }
...
```

#### `amount`

Each price type includes extra formatting arguments in the `amount` field, where you can specify if you want to, and how to, format the price asa  currency:

```graphql
...
  price {
    amount(format: true) # Defaults to en-US locale, and the store's currency code.
    # Result: $25.00
  }
...
...
  priceRange {
    minVariantPrice {
      amount(locale: "en-GB", currency: "GBP") # Specify a locale and a currency code to use.
      # Result: £25.00
    }
  }
...
```

## Helpful Snippets

You will probably need to find a product variant by the options that have been selected - computed properties are your friend...

```vue
<template>
  ...
    <div
      v-for="option in $page.shopifyProduct.options"
      :key="option.id"
      class="field">
      <div class="control">
        <label
          :for="option.name"
          class="label">
          {{ option.name }}
          <div class="select is-fullwidth">
            <select
              :id="option.name"
              v-model="selectedOptions[option.name]">
              <option
                v-for="value in option.values"
                :key="value"
                :value="value">
                {{ value }}
              </option>
            </select>
          </div>
        </label>
      </div>
    </div>
    <div>
      <img :src="currentVariant.image.transformedSrc">
      <div v-html="$page.shopifyProduct.descriptionHtml" />
    </div>
  ...
</template>

<script>
export default {
  data: () => ({
    selectedOptions: {}
  }),
  computed: {
    currentVariant () {
      // Find a variant where every variants options matches those that are currently selected
      return this.$page.shopifyProduct.variants.find(variant => variant.selectedOptions.every(({ name, value }) => value === this.selectedOptions[ name ]))
    }
  },
  // Set the first variant as a default option
  mounted () {
    const [firstVariant] = this.$page.shopifyProduct.variants
    this.selectedOptions = firstVariant.selectedOptions.reduce((options, { name, value }) => ({ [ name ]: value, ...options }), {})
  },
  // The mounted hook doesn't always run on page change - so make sure we set the first variant if the route changes
  watch: {
    $route (to, from) {
      const [firstVariant] = this.$page.shopifyProduct.variants
      this.selectedOptions = firstVariant.selectedOptions.reduce((options, { name, value }) => ({ [ name ]: value, ...options }), {})
    }
  }
}
</script>
```

All Shopify products have at least one variant - even if a product has no options (i.e. colour/size), it will have a default variant that contains the base product price/title etc. This single variant will also create a default option (`title`), which you will most likely want to filter out, as there is only one variant you can select anyway. If this is the case then the product options should be hidden, and the single variant set as the default selected option (as above):

```vue
<template>
  ...
    <div
      v-for="option in productOptions"
      :key="option.id"
      class="field">
      ...
    </div>
  ...
</template>

<script>
export default {
  ...
  computed: {
    // Single variants have an default option called 'Title' - filter this out.
    productOptions () { return this.product.options.filter(({ name }) => name !== 'Title') },
  }
  ...
}
</script>
```

You can also create relationships from products/product variants to other types, if they return an ID or array of ID's as one of their fields. For example, with Contentful's integration you could do something like the below:

`gridsome.server.js`
```js
module.exports = api => {
  api.loadSource(actions => {
    const contentfulProducts = actions.getCollection('ContentfulProduct')
    contentfulProducts.addReference('shopifyProductVariantId', 'ShopifyProductVariant')
  }
}
```

Then query the actual product/product variant from within a query:

```graphql
query {
  allContentfulProduct {
    edges {
      node {
       name
        shopifyProductVariantId {
          id
          title
          price {
            amount
          }
        }
      }
    }
  }
}
```
