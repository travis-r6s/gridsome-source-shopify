export const createSchema = ({ addSchemaTypes, schema, addSchemaResolvers }, { TYPENAMES, hasLocales, createShopifyId }) => {
  addSchemaTypes([
    schema.createEnumType({
      name: `${TYPENAMES.IMAGE}CropMode`,
      values: {
        CENTER: {},
        TOP: {},
        LEFT: {},
        BOTTOM: {},
        RIGHT: {}
      }
    }),
    schema.createObjectType({
      name: TYPENAMES.IMAGE,
      interfaces: ['Node'],
      fields: {
        altText: 'String',
        originalSrc: 'String',
        transformedSrc: 'String'
      }
    }),
    schema.createObjectType({
      name: TYPENAMES.PRICE,
      interfaces: ['Node'],
      fields: {
        amount: 'String',
        currencyCode: 'String'
      }
    })
  ])
  addSchemaResolvers({
    [ TYPENAMES.IMAGE ]: {
      transformedSrc: {
        args: {
          maxWidth: 'Int',
          maxHeight: 'Int',
          crop: `${TYPENAMES.IMAGE}CropMode`,
          scale: 'Int'
        },
        resolve ({ originalSrc }, { maxHeight, maxWidth, crop, scale }) {
          // Create the transform for Shopify CDN
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
    },
    [ TYPENAMES.PRICE ]: {
      amount: {
        args: {
          locale: 'String',
          currency: 'String',
          format: 'Boolean'
        },
        resolve: ({ amount, currencyCode }, { locale = 'en-US', currency, format = false }) => {
          if (!currency && !format) return amount
          return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || currencyCode }).format(amount)
        }
      }
    }
  })

  if (hasLocales) {
    addSchemaTypes(`
      type ${TYPENAMES.PRODUCT_VARIANT}_SelectedOptions @infer {
        name: String
        value: String
      }
    `)

    const translatableTypes = [
      [TYPENAMES.PRODUCT, TYPENAMES.PRODUCT_TRANSLATION, ['title', 'description', 'descriptionHtml']],
      [TYPENAMES.PRODUCT_VARIANT, TYPENAMES.PRODUCT_VARIANT_TRANSLATION, ['title', 'selectedOptions']],
      [TYPENAMES.COLLECTION, TYPENAMES.COLLECTION_TRANSLATION, ['title', 'description', 'descriptionHtml']],
      [TYPENAMES.ARTICLE, TYPENAMES.ARTICLE_TRANSLATION, ['title', 'content', 'contentHtml', 'excerpt', 'excerptHtml']],
      [TYPENAMES.BLOG, TYPENAMES.BLOG_TRANSLATION, ['title']],
      [TYPENAMES.PAGE, TYPENAMES.PAGE_TRANSLATION, ['title', 'body']]
    ]

    const resolvers = translatableTypes.map(([typeName, translationTypeName, fields]) => {
      const resolvers = fields.map(field => {
        return [field, {
          type: field === 'selectedOptions' ? `[${TYPENAMES.PRODUCT_VARIANT}_SelectedOptions]` : 'String',
          args: {
            locale: 'String'
          },
          resolve: (parent, { locale }, ctx) => {
            if (!locale) return Reflect.get(parent, field)
            const translationId = createShopifyId(parent.id, `Locale${locale.toUpperCase()}`)
            const translationsStore = ctx.store.getCollection(translationTypeName)

            const translation = translationsStore.getNode(translationId)
            if (!translation) return Reflect.get(parent, field)
            return Reflect.get(translation, field)
          }
        }]
      })

      return [typeName, Object.fromEntries(resolvers)]
    })

    addSchemaResolvers(Object.fromEntries(resolvers))
  }
}
