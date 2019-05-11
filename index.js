const camelCase = require('camelcase')
const { createClient } = require('./client')
const { PRODUCTS_QUERY } = require('./queries')

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
      products: '/products/:slug'
    }

    api.loadSource(async store => {
      this.store = store

      console.log(`Loading data from ${options.storeUrl}`)

      await this.getProductTypes(store)
      await this.getProducts(store)
    })
  }

  async getProductTypes (store) {

  }

  async getProducts (store) {
    const { products: { edges: data } } = await this.shopify.request(PRODUCTS_QUERY, { first: this.options.perPage })

    const products = store.addContentType({
      typeName: this.createTypeName(PRODUCT),
      route: this.routes.products
    })

    data.forEach(({ node: product }) => {
      products.addNode({
        id: product.id,
        createdAt: product.createdAt,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        slug: product.handle,
        handle: product.handle,
        images: product.images.edges.map(({ node: image }) => image),
        onlineStoreUrl: product.onlineStoreUrl,
        options: product.options,
        priceRange: product.priceRange,
        product: product.productType,
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
