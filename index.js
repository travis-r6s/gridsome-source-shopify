const camelCase = require('camelcase')
const { createClient } = require('./client')
const { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY } = require('./queries')

// Node prefix
const TYPE_PREFIX = 'Shopify'

// Node types
const ARTICLE = 'Article'
const BLOG = 'Blog'
const COLLECTION = 'Collection'
const COMMENT = 'Comment'
const PRODUCT = 'Product'
const PRODUCT_OPTION = 'ProductOption'
const PRODUCT_VARIANT = 'ProductVariant'
const SHOP_POLICY = 'ShopPolicy'
const PRODUCT_TYPE = 'ProductType'

class ShopifySource {
  static defaultOptions () {
    return {
      storeUrl: '',
      storefrontToken: '',
      typeName: TYPE_PREFIX,
      types: [
        'Product'
      ],
      perPage: 100
    }
  }
  constructor(api, options) {
    this.options = options

    if (!options.storeUrl) throw new Error('Missing store url.')
    if (!options.storefrontToken) throw new Error('Missing storefront access token.')

    this.shopify = createClient(options)

    this.routes = {
      products: '/products/:slug',
      collections: '/collections/:slug'
    }

    api.loadSource(async store => {
      this.store = store

      console.log(`Loading data from ${options.storeUrl}`)

      // await this.getProductTypes(store)
      await this.getCollections(store)
      await this.getProducts(store)
    })
  }

  // async getProductTypes (store) {
  //   const { productTypes: { edges: data } } = await this.shopify.request(PRODUCT_TYPES_QUERY, { first: this.options.perPage })

  //   data.forEach(({ node: type }) => {
  //     store.addContentType({
  //       typeName: this.createTypeName(PRODUCT_TYPE),
  //       route: `types/:slug`
  //     })
  //   })
  // }

  async getCollections (store) {
    const { getContentType, createReference } = store

    const PRODUCT_TYPE_NAME = this.createTypeName(PRODUCT)

    const { collections: { edges: data } } = await this.shopify.request(COLLECTIONS_QUERY, { first: this.options.perPage })

    const collections = store.addContentType({
      typeName: this.createTypeName(COLLECTION),
      route: this.routes.collections
    })

    data.forEach(({ node: collection }) => {
      const products = collection.products.edges.map(({ node: product }) => createReference(PRODUCT_TYPE_NAME, product.id))
      collections.addNode({
        id: collection.id,
        description: collection.description,
        descriptionHtml: collection.descriptionHtml,
        handle: collection.handle,
        slug: collection.handle,
        image: collection.image,
        title: collection.title,
        updatedAt: collection.updatedAt,
        products
      })
    })
  }


  async getProducts (store) {
    const { getContentType, createReference } = store

    const COLLECTION_TYPE_NAME = this.createTypeName(COLLECTION)

    const { products: { edges: data } } = await this.shopify.request(PRODUCTS_QUERY, { first: this.options.perPage })

    const products = store.addContentType({
      typeName: this.createTypeName(PRODUCT),
      route: this.routes.products
    })

    data.forEach(({ node: product }) => {
      const collections = product.collections.edges.map(({ node: collection }) => createReference(COLLECTION_TYPE_NAME, collection.id))
      products.addNode({
        id: product.id,
        createdAt: product.createdAt,
        collections: collections,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        slug: product.handle,
        handle: product.handle,
        images: product.images.edges.map(({ node: image }) => image),
        onlineStoreUrl: product.onlineStoreUrl,
        options: product.options,
        priceRange: product.priceRange,
        product: product.productType,
        productType: product.productType,
        published: product.publishedAt,
        tags: product.tags,
        title: product.title,
        updatedAt: product.updatedAt,
        vendor: product.vendor
      })
    })
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}


module.exports = ShopifySource
