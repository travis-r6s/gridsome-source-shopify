import camelCase from 'camelcase'
import { createClient, queryAll } from './client'
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY } from './queries'

// Node prefix
const TYPE_PREFIX = 'Shopify'

// Node types
const ARTICLE = 'Article'
const BLOG = 'Blog'
const COLLECTION = 'Collection'
const PRODUCT = 'Product'
const PRODUCT_OPTION = 'ProductOption'
const PRODUCT_VARIANT = 'ProductVariant'
const SHOP_POLICY = 'ShopPolicy'
const PRODUCT_TYPE = 'ProductType'

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

  constructor (api, options) {
    this.options = options

    if (!options.storeUrl && !options.storeName) throw new Error('Missing store name or url.')
    if (!options.storefrontToken) throw new Error('Missing storefront access token.')
    if (options.storeName) this.options.storeUrl = `https://${options.storeName}.myshopify.com`

    this.shopify = createClient(options)

    api.loadSource(async store => {
      this.store = store

      console.log(`Loading data from ${options.storeUrl}`)

      await this.getProductTypes(store)
      await this.getCollections(store)
      await this.getProducts(store)
    })
  }

  async getProductTypes (store) {
    const PRODUCT_TYPE_TYPE_NAME = this.createTypeName(PRODUCT_TYPE)
    const productTypeStore = store.addCollection({ typeName: PRODUCT_TYPE_TYPE_NAME })

    const allProductTypes = await queryAll(this.shopify, PRODUCT_TYPES_QUERY, this.options.first)

    for (const productType of allProductTypes) {
      if (productType) productTypeStore.addNode({ title: productType })
    }
  }

  async getCollections (store) {
    const { getContentType, createReference } = store

    const PRODUCT_TYPE_NAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPE_NAME = this.createTypeName(COLLECTION)
    const collectionStore = store.addCollection({ typeName: COLLECTION_TYPE_NAME })

    const allCollections = await queryAll(this.shopify, COLLECTIONS_QUERY, this.options.first)

    for (const collection of allCollections) {
      const products = collection.products.edges.map(({ node: product }) => createReference(PRODUCT_TYPE_NAME, product.id))
      collectionStore.addNode({
        ...collection,
        products
      })
    }
  }

  async getProducts (store) {
    const { getContentType, createReference } = store

    const PRODUCT_TYPE_NAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPE_NAME = this.createTypeName(COLLECTION)
    const productStore = store.addCollection({ typeName: PRODUCT_TYPE_NAME })

    const allProducts = await queryAll(this.shopify, PRODUCTS_QUERY, this.options.first)

    for (const product of allProducts) {
      const collections = product.collections.edges.map(({ node: collection }) => createReference(COLLECTION_TYPE_NAME, collection.id))
      productStore.addNode({
        ...product,
        collections: collections,
        images: product.images.edges.map(({ node: image }) => image)
      })
    }
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}

module.exports = ShopifySource
