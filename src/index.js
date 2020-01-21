import camelCase from 'camelcase'
import nanoid from 'nanoid'
import { createClient, queryAll } from './client'
import { createSchema } from './schema'
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY, ARTICLES_QUERY, BLOGS_QUERY, PAGES_QUERY } from './queries'

// Node prefix
const TYPE_PREFIX = 'Shopify'

// Node types
const ARTICLE = 'Article'
const BLOG = 'Blog'
const COLLECTION = 'Collection'
const PRODUCT = 'Product'
const PAGE = 'Page'
const PRODUCT_TYPE = 'ProductType'
const IMAGE_TYPENAME = 'Image'
const PRICE_TYPENAME = 'Price'

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

    // Create custom schema type for ShopifyImage
    api.loadSource(actions => {
      createSchema(actions, { IMAGE_TYPENAME, PRICE_TYPENAME })
    })

    // Load data into store
    api.loadSource(async actions => {
      console.log(`Loading data from ${options.storeUrl}`)

      await this.setupStore(actions)
      await this.getProductTypes(actions)
      await this.getCollections(actions)
      await this.getProducts(actions)
      await this.getBlogs(actions)
      await this.getArticles(actions)
      await this.getPages(actions)
    })
  }

  async setupStore (actions) {
    actions.addCollection({ typeName: PRICE_TYPENAME })
    actions.addCollection({ typeName: IMAGE_TYPENAME })
  }

  async getProductTypes (actions) {
    const PRODUCT_TYPE_TYPENAME = this.createTypeName(PRODUCT_TYPE)
    const productTypeStore = actions.addCollection({ typeName: PRODUCT_TYPE_TYPENAME })

    const allProductTypes = await queryAll(this.shopify, PRODUCT_TYPES_QUERY, this.options.perPage)

    for (const productType of allProductTypes) {
      if (productType) productTypeStore.addNode({ title: productType })
    }
  }

  async getCollections (actions) {
    const { createReference } = actions

    const PRODUCT_TYPENAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPENAME = this.createTypeName(COLLECTION)
    const collectionStore = actions.addCollection({ typeName: COLLECTION_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)

    const allCollections = await queryAll(this.shopify, COLLECTIONS_QUERY, this.options.perPage)

    for (const collection of allCollections) {
      const products = collection.products.edges.map(({ node: product }) => createReference(PRODUCT_TYPENAME, product.id))

      let image
      if (collection.image) {
        imageStore.addNode({ ...collection.image, altText: collection.image?.altText })
        image = createReference(IMAGE_TYPENAME, collection.image.id)
      }

      collectionStore.addNode({
        ...collection,
        image,
        products
      })
    }
  }

  async getProducts (actions) {
    const { createReference } = actions

    const PRODUCT_TYPENAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPENAME = this.createTypeName(COLLECTION)

    const productStore = actions.addCollection({ typeName: PRODUCT_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)
    const priceStore = actions.getCollection(PRICE_TYPENAME)

    const allProducts = await queryAll(this.shopify, PRODUCTS_QUERY, this.options.perPage)

    for (const product of allProducts) {
      const collections = product.collections.edges.map(({ node: collection }) => createReference(COLLECTION_TYPENAME, collection.id))
      const priceRange = this.getProductPriceRanges(product, actions)

      const images = product.images.edges.map(({ node: image }) => {
        imageStore.addNode({ ...image, altText: image?.altText })
        return createReference(IMAGE_TYPENAME, image.id)
      })

      const variants = product.variants.edges.map(({ node: variant }) => {
        let image
        if (variant.image) {
          image = createReference(IMAGE_TYPENAME, variant.image.id)
        }

        const variantPrice = priceStore.addNode({ id: nanoid(), ...variant.price })
        variant.price = createReference(PRICE_TYPENAME, variantPrice.id)

        return { ...variant, image }
      })

      productStore.addNode({
        ...product,
        collections,
        priceRange,
        variants,
        images
      })
    }
  }

  getProductPriceRanges (product, actions) {
    const { createReference } = actions

    const priceStore = actions.getCollection(PRICE_TYPENAME)
    const minVariantPrice = priceStore.addNode({ id: nanoid(), ...product.priceRange.minVariantPrice })
    const minVariantPriceId = createReference(PRICE_TYPENAME, minVariantPrice.id)
    const maxVariantPrice = priceStore.addNode({ id: nanoid(), ...product.priceRange.maxVariantPrice })
    const maxVariantPriceId = createReference(PRICE_TYPENAME, maxVariantPrice.id)

    return { minVariantPrice: minVariantPriceId, maxVariantPrice: maxVariantPriceId }
  }

  async getBlogs (actions) {
    const BLOG_TYPENAME = this.createTypeName(BLOG)
    const blogStore = actions.addCollection({ typeName: BLOG_TYPENAME })

    const allBlogs = await queryAll(this.shopify, BLOGS_QUERY, this.options.perPage)

    for (const blog of allBlogs) {
      blogStore.addNode(blog)
    }
  }

  async getArticles (actions) {
    const { createReference } = actions

    const ARTICLE_TYPENAME = this.createTypeName(ARTICLE)
    const BLOG_TYPENAME = this.createTypeName(BLOG)
    const articleStore = actions.addCollection({ typeName: ARTICLE_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)

    const allArticles = await queryAll(this.shopify, ARTICLES_QUERY, this.options.perPage)

    for (const article of allArticles) {
      let image
      if (article.image) {
        imageStore.addNode({ ...article.image, altText: article.image?.altText })
        image = createReference(IMAGE_TYPENAME, article.image.id)
      }

      const blog = createReference(BLOG_TYPENAME, article.blog.id)

      articleStore.addNode({
        ...article,
        blog,
        image
      })
    }
  }

  async getPages (actions) {
    const PAGE_TYPENAME = this.createTypeName(PAGE)
    const pageStore = actions.addCollection({ typeName: PAGE_TYPENAME })

    const allPages = await queryAll(this.shopify, PAGES_QUERY, this.options.perPage)

    for (const page of allPages) {
      pageStore.addNode(page)
    }
  }

  createTypeName (name, suffix = '') {
    let typeName = this.options.typeName
    // If typeName is blank, we need to add a preifx to these types anyway, as on their own they conflict with internal Gridsome types.
    const types = ['Page', 'Image']
    if (!typeName && types.includes(name)) typeName = 'Shopify'

    return camelCase(`${typeName} ${name}`, { pascalCase: true }) + suffix
  }
}

module.exports = ShopifySource
