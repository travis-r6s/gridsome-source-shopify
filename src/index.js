import camelCase from 'camelcase'
import { createClient, queryAll } from './client'
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY, ARTICLES_QUERY, BLOGS_QUERY, SHOP_POLICIES_QUERY } from './queries'

// Node prefix
const TYPE_PREFIX = 'Shopify'

// Node types
const ARTICLE = 'Article'
const BLOG = 'Blog'
const COLLECTION = 'Collection'
const PRODUCT = 'Product'
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

    api.loadSource(async actions => {
      console.log(`Loading data from ${options.storeUrl}`)

      await this.getProductTypes(actions)
      await this.getCollections(actions)
      await this.getProducts(actions)
      await this.getBlogs(actions)
      await this.getArticles(actions)
    })
  }

  async getProductTypes (actions) {
    const PRODUCT_TYPE_TYPENAME = this.createTypeName(PRODUCT_TYPE)
    const productTypeStore = actions.addCollection({ typeName: PRODUCT_TYPE_TYPENAME })

    const allProductTypes = await queryAll(this.shopify, PRODUCT_TYPES_QUERY, this.options.first)

    for (const productType of allProductTypes) {
      if (productType) productTypeStore.addNode({ title: productType })
    }
  }

  async getCollections (actions) {
    const { createReference } = actions

    const PRODUCT_TYPENAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPENAME = this.createTypeName(COLLECTION)
    const collectionStore = actions.addCollection({ typeName: COLLECTION_TYPENAME })

    const allCollections = await queryAll(this.shopify, COLLECTIONS_QUERY, this.options.first)

    for (const collection of allCollections) {
      const products = collection.products.edges.map(({ node: product }) => createReference(PRODUCT_TYPENAME, product.id))
      collectionStore.addNode({
        ...collection,
        products
      })
    }
  }

  async getProducts (actions) {
    const { createReference } = actions

    const PRODUCT_TYPENAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPENAME = this.createTypeName(COLLECTION)
    const productStore = actions.addCollection({ typeName: PRODUCT_TYPENAME })

    const allProducts = await queryAll(this.shopify, PRODUCTS_QUERY, this.options.first)

    for (const product of allProducts) {
      const collections = product.collections.edges.map(({ node: collection }) => createReference(COLLECTION_TYPENAME, collection.id))
      productStore.addNode({
        ...product,
        collections: collections,
        images: product.images.edges.map(({ node: image }) => image)
      })
    }
  }

  async getBlogs (actions) {
    const BLOG_TYPENAME = this.createTypeName(BLOG)
    const ARTICLE_TYPENAME = this.createTypeName(ARTICLE)
    const blogStore = actions.addCollection({ typeName: BLOG_TYPENAME })
    blogStore.addReference('articles', ARTICLE_TYPENAME)

    const allBlogs = await queryAll(this.shopify, BLOGS_QUERY, this.options.first)

    for (const blog of allBlogs) {
      blogStore.addNode(blog)
    }
  }

  async getArticles (actions) {
    const { createReference } = actions

    const ARTICLE_TYPENAME = this.createTypeName(ARTICLE)
    const BLOG_TYPENAME = this.createTypeName(BLOG)
    const articleStore = actions.addCollection({ typeName: ARTICLE_TYPENAME })

    const allArticles = await queryAll(this.shopify, ARTICLES_QUERY, this.options.first)

    for (const article of allArticles) {
      const blog = createReference(BLOG_TYPENAME, article.blog.id)
      articleStore.addNode({
        ...article,
        blog
      })
    }
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}

module.exports = ShopifySource
