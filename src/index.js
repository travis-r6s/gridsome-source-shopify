import camelCase from 'camelcase'
import { createClient } from './client'
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY } from './queries'

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

const allTypes = new Map( [
  [PRODUCT, PRODUCTS_QUERY],
  [COLLECTION, COLLECTIONS_QUERY]
] )

class ShopifySource {
  static defaultOptions () {
    return {
      storeName: '',
      storeUrl: '',
      storefrontToken: '',
      typeName: TYPE_PREFIX,
      types: [PRODUCT, COLLECTION, PRODUCT_TYPE],
      perPage: 100
    }
  }
  constructor(api, options) {
    this.options = options

    if (!options.storeUrl && !options.storeName) throw new Error('Missing store name or url.')
    if (!options.storefrontToken) throw new Error('Missing storefront access token.')
    if (options.storeName) this.options.storeUrl = `https://${options.storeName}.myshopify.com`

    this.shopify = createClient(options)

    api.loadSource(async store => {
      this.store = store

      console.log(`Loading data from ${options.storeUrl}`)

      // await this.getProductTypes(store)
      await this.getCollections(store)
      await this.getProducts(store)
    })
  }

  async getType ( type, store ) {
    const { getContentType, createReference } = store

    const typeQuery = allTypes.get(type)
    const TYPE_NAME = this.createTypeName( type )


    const { data: { edges: data } } = await this.shopify.request( typeQuery, { first: this.options.perPage } )


  }

  // async getProductTypes (store) {
  //   const { productTypes: { edges: data } } = await this.shopify.request(PRODUCT_TYPES_QUERY, { first: this.options.perPage })

  //   data.forEach(({ node: type }) => {
  //     store.addCollection({
  //       typeName: this.createTypeName(PRODUCT_TYPE),
  //       route: `types/:slug`
  //     })
  //   })
  // }

  async getCollections (store) {
    const { getContentType, createReference } = store

    const PRODUCT_TYPE_NAME = this.createTypeName(PRODUCT)

    const { collections: { edges: data } } = await this.shopify.request(COLLECTIONS_QUERY, { first: this.options.perPage })

    const collections = store.addCollection({
      typeName: this.createTypeName(COLLECTION)
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

    const products = store.addCollection({
      typeName: this.createTypeName(PRODUCT)
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
