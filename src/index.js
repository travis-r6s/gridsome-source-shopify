import camelCase from 'camelcase'
import { createClient, queryAll } from './client'
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
const IMAGE = 'Image'

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
    api.loadSource(({ addSchemaTypes, schema, addSchemaResolvers }) => {
      const IMAGE_TYPENAME = this.createTypeName(IMAGE)
      addSchemaTypes([
        schema.createEnumType({
          name: `${IMAGE_TYPENAME}CropMode`,
          values: {
            CENTER: {},
            TOP: {},
            LEFT: {},
            BOTTOM: {},
            RIGHT: {}
          }
        }),
        schema.createObjectType({
          name: IMAGE_TYPENAME,
          interfaces: ['Node'],
          fields: {
            altText: 'String',
            originalSrc: 'String',
            transformedSrc: 'String'
          }
        })
      ])
      addSchemaResolvers({
        [ IMAGE_TYPENAME ]: {
          transformedSrc: {
            args: {
              maxWidth: 'Int',
              maxHeight: 'Int',
              crop: `${IMAGE_TYPENAME}CropMode`,
              scale: 'Int'
            },
            resolve ({ originalSrc }, { maxHeight, maxWidth, crop, scale }) {
              // Create the transform for Shopif CDN
              const dot = originalSrc.lastIndexOf('.')
              const path = originalSrc.slice(0, dot)
              const ext = originalSrc.slice(dot)
              const transforms = []

              if (maxWidth && maxHeight) transforms.push(`_${maxWidth}x${maxHeight}`)
              else if (maxWidth) transforms.push(`_${maxWidth}x`)
              else if (maxHeight) transforms.push(`_x${maxHeight}`)

              if (crop && (maxWidth || maxHeight)) transforms.push(`_crop_${crop.toLowerCase()}`)
              if (scale && scale !== 1) transforms.push(`@${scale}x`)

              const transformedSrc = `${path}${transforms.join('')}${ext}`
              return transformedSrc
            }
          }
        }
      })
    })

    // Load data into store
    api.loadSource(async actions => {
      console.log(`Loading data from ${options.storeUrl}`)

      await this.setupImages(actions)
      await this.getProductTypes(actions)
      await this.getCollections(actions)
      await this.getProducts(actions)
      await this.getBlogs(actions)
      await this.getArticles(actions)
      await this.getPages(actions)
    })
  }

  async setupImages (actions) {
    const IMAGE_TYPENAME = this.createTypeName(IMAGE)
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
    const IMAGE_TYPENAME = this.createTypeName(IMAGE)
    const collectionStore = actions.addCollection({ typeName: COLLECTION_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)

    const allCollections = await queryAll(this.shopify, COLLECTIONS_QUERY, this.options.perPage)

    for (const collection of allCollections) {
      const products = collection.products.edges.map(({ node: product }) => createReference(PRODUCT_TYPENAME, product.id))
      const image = { ...collection.image, altText: collection.image.altText || '' }
      const collectionImage = createReference('ShopifyImage', image.id)
      imageStore.addNode(image)

      collectionStore.addNode({
        ...collection,
        image: collectionImage,
        products
      })
    }
  }

  async getProducts (actions) {
    const { createReference } = actions

    const PRODUCT_TYPENAME = this.createTypeName(PRODUCT)
    const COLLECTION_TYPENAME = this.createTypeName(COLLECTION)
    const IMAGE_TYPENAME = this.createTypeName(IMAGE)
    const productStore = actions.addCollection({ typeName: PRODUCT_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)

    const allProducts = await queryAll(this.shopify, PRODUCTS_QUERY, this.options.perPage)

    for (const product of allProducts) {
      const collections = product.collections.edges.map(({ node: collection }) => createReference(COLLECTION_TYPENAME, collection.id))
      const images = product.images.edges.map(({ node: image }) => {
        imageStore.addNode({ ...image, altText: image.altText || '' })
        return createReference(IMAGE_TYPENAME, image.id)
      })
      const variants = product.variants.edges.map(({ node: variant }) => {
        const image = createReference(IMAGE_TYPENAME, variant.image.id)
        return { ...variant, image }
      })
      productStore.addNode({
        ...product,
        collections,
        variants,
        images
      })
    }
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
    const IMAGE_TYPENAME = this.createTypeName(IMAGE)
    const articleStore = actions.addCollection({ typeName: ARTICLE_TYPENAME })
    const imageStore = actions.getCollection(IMAGE_TYPENAME)

    const allArticles = await queryAll(this.shopify, ARTICLES_QUERY, this.options.perPage)

    for (const article of allArticles) {
      const blog = createReference(BLOG_TYPENAME, article.blog.id)
      imageStore.addNode({ ...article.image, altText: article.image.altText || '' })
      const image = createReference(IMAGE_TYPENAME, article.image.id)
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

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }
}

module.exports = ShopifySource
