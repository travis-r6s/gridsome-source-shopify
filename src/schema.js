export const createSchema = ({ addSchemaTypes, schema, addSchemaResolvers }, { TYPENAMES }) => {
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
}
