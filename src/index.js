import camelCase from 'camelcase'
import { createClient, queryAll } from './client'
import { createSchema } from './schema'
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_TYPES_QUERY, ARTICLES_QUERY, BLOGS_QUERY, PAGES_QUERY, PRODUCT_TAGS_QUERY } from './queries'

class ShopifySource {
  static defaultOptions () {
    return {
      storeName: '',
      storeUrl: '',
      storefrontToken: '',
      typeName: 'Shopify',
      types: [],
      perPage: 100,
      timeout: 60000
    }
  }

  constructor (api, options) {
    this.options = options

    if (!options.storeUrl && !options.storeName) throw new Error('Missing store name or url.')
    if (!options.storefrontToken) throw new Error('Missing storefront access token.')
    if (options.storeName) this.options.storeUrl = `https://${options.storeName}.myshopify.com`

    // Node Types
    this.TYPENAMES = {
      ARTICLE: this.createTypeName('Article'),
      BLOG: this.createTypeName('Blog'),
      COLLECTION: this.createTypeName('Collection'),
      PRODUCT: this.createTypeName('Product'),
      PRODUCT_VARIANT: this.createTypeName('ProductVariant'),
      PAGE: this.createTypeName('Page'),
      PRODUCT_TYPE: this.createTypeName('ProductType'),
      PRODUCT_TAG: this.createTypeName('ProductTag'),
      IMAGE: 'ShopifyImage',
      PRICE: 'ShopifyPrice'
    }

    // Set included types
    this.typesToInclude = options.types.length ? options.types.map(type => this.createTypeName(type)) : Object.values(this.TYPENAMES)

    this.shopify = createClient(options)

    // Create custom schema type for ShopifyImage
    api.loadSource(actions => {
      createSchema(actions, { TYPENAMES: this.TYPENAMES })
    })

    // Load data into store
    api.loadSource(async actions => {
      console.log(`Loading data from ${options.storeUrl}`)

      await this.setupStore(actions)
      await this.getProductTypes(actions)
      await this.getProductTags(actions)
      await this.getCollections(actions)
      await this.getProducts(actions)
      await this.getBlogs(actions)
      await this.getArticles(actions)
      await this.getPages(actions)
    })
  }

  async setupStore (actions) {
    actions.addCollection({ typeName: this.TYPENAMES.PRICE })
    actions.addCollection({ typeName: this.TYPENAMES.IMAGE })
  }

  async getProductTypes (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.PRODUCT_TYPE)) return

    const productTypeStore = actions.addCollection({ typeName: this.TYPENAMES.PRODUCT_TYPE })

    const allProductTypes = await queryAll(this.shopify, PRODUCT_TYPES_QUERY, { first: this.options.perPage })

    for (const productType of allProductTypes) {
      if (productType) productTypeStore.addNode({ title: productType })
    }
  }

  async getProductTags (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.PRODUCT_TAG)) return

    const productTagStore = actions.addCollection({ typeName: this.TYPENAMES.PRODUCT_TAG })

    const allProductTags = await queryAll(this.shopify, PRODUCT_TAGS_QUERY, { first: this.options.perPage })

    for (const productTag of allProductTags) {
      if (productTag) productTagStore.addNode({ title: productTag })
    }
  }

  async getCollections (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.COLLECTION)) return

    const imageStore = actions.getCollection(this.TYPENAMES.IMAGE)
    const collectionStore = actions.addCollection({ typeName: this.TYPENAMES.COLLECTION })

    const allCollections = await queryAll(this.shopify, COLLECTIONS_QUERY, { first: this.options.perPage })

    for (const collection of allCollections) {
      collection.products = collection.products.edges.map(({ node: product }) => actions.createReference(this.TYPENAMES.PRODUCT, product.id))

      if (collection.image) {
        const collectionImage = imageStore.addNode(collection.image)
        collection.image = actions.createReference(collectionImage)
      }

      collectionStore.addNode(collection)
    }
  }

  async getProducts (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.PRODUCT)) return

    const productStore = actions.addCollection({ typeName: this.TYPENAMES.PRODUCT })
    const productVariantStore = actions.addCollection({ typeName: this.TYPENAMES.PRODUCT_VARIANT })
    const imageStore = actions.getCollection(this.TYPENAMES.IMAGE)
    const priceStore = actions.getCollection(this.TYPENAMES.PRICE)

    const allProducts = await queryAll(this.shopify, PRODUCTS_QUERY, { first: this.options.perPage })

    for (const product of allProducts) {
      product.collections = product.collections.edges.map(({ node: collection }) => actions.createReference(this.TYPENAMES.COLLECTION, collection.id))

      const priceRange = this.getProductPriceRanges('priceRange', product, actions)
      const compareAtPriceRange = this.getProductPriceRanges('compareAtPriceRange', product, actions)

      const images = product.images.edges.map(({ node: image }) => {
        const productImage = imageStore.addNode(image)
        return actions.createReference(productImage)
      })

      const variants = product.variants.edges.map(({ node: variant }) => {
        if (variant.image) {
          variant.image = actions.createReference(this.TYPENAMES.IMAGE, variant.image.id)
        }

        const price = priceStore.addNode({ id: this.createShopifyId(variant.id, 'Price'), ...variant.price })
        variant.price = actions.createReference(price)

        const unitPrice = priceStore.addNode({ id: this.createShopifyId(variant.id, 'UnitPrice'), ...variant.unitPrice })
        variant.unitPrice = actions.createReference(unitPrice)

        const compareAtPrice = priceStore.addNode({ id: this.createShopifyId(variant.id, 'CompareAtPrice'), ...variant.compareAtPrice })
        variant.compareAtPrice = actions.createReference(compareAtPrice)

        const variantNode = productVariantStore.addNode(variant)
        return actions.createReference(variantNode)
      })

      productStore.addNode({
        ...product,
        priceRange,
        compareAtPriceRange,
        variants,
        images
      })
    }
  }

  getProductPriceRanges (key, product, actions) {
    const priceStore = actions.getCollection(this.TYPENAMES.PRICE)

    const priceRange = product[ key ]
    const minVariantPrice = priceStore.addNode({ id: this.createShopifyId(product.id, `/${key}/MinVariantPrice`), ...priceRange.minVariantPrice })
    const maxVariantPrice = priceStore.addNode({ id: this.createShopifyId(product.id, `/${key}/MaxVariantPrice`), ...priceRange.maxVariantPrice })

    return { minVariantPrice: actions.createReference(minVariantPrice), maxVariantPrice: actions.createReference(maxVariantPrice) }
  }

  async getBlogs (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.BLOG)) return

    const blogStore = actions.addCollection({ typeName: this.TYPENAMES.BLOG })

    const allBlogs = await queryAll(this.shopify, BLOGS_QUERY, { first: this.options.perPage })

    for (const blog of allBlogs) {
      blogStore.addNode(blog)
    }
  }

  async getArticles (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.ARTICLE)) return

    const articleStore = actions.addCollection({ typeName: this.TYPENAMES.ARTICLE })
    const imageStore = actions.getCollection(this.TYPENAMES.IMAGE)

    const allArticles = await queryAll(this.shopify, ARTICLES_QUERY, { first: this.options.perPage })

    for (const article of allArticles) {
      if (article.image) {
        const articleImage = imageStore.addNode(article.image)
        article.image = actions.createReference(articleImage)
      }

      if (this.typesToInclude.includes(this.TYPENAMES.BLOG)) {
        article.blog = actions.createReference(this.TYPENAMES.BLOG, article.blog.id)
      }

      articleStore.addNode(article)
    }
  }

  async getPages (actions) {
    if (!this.typesToInclude.includes(this.TYPENAMES.PAGE)) return

    const pageStore = actions.addCollection({ typeName: this.TYPENAMES.PAGE })

    const allPages = await queryAll(this.shopify, PAGES_QUERY, { first: this.options.perPage })

    for (const page of allPages) {
      pageStore.addNode(page)
    }
  }

  createTypeName (name) {
    let typeName = this.options.typeName
    // If typeName is blank, we need to add a prefix to these types anyway, as on their own they conflict with internal Gridsome types.
    const types = ['Page']
    if (!typeName && types.includes(name)) typeName = 'Shopify'

    return camelCase(`${typeName} ${name}`, { pascalCase: true })
  }

  createShopifyId (id, name) {
    const originalId = Buffer.from(id, 'base64').toString()
    const key = camelCase(name, { pascalCase: true })
    return Buffer.from(`${originalId}/${key}`).toString('base64')
  }
}

module.exports = ShopifySource
