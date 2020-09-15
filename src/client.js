import got from 'got'
import { COLLECTION_QUERY } from './queries'

/**
 * Create a Shopify Storefront GraphQL client for the provided name and token.
 */
export const createClient = ({ storeUrl, storefrontToken, timeout }) => got.extend({
  prefixUrl: `${storeUrl}/api/2020-10`,
  headers: {
    'X-Shopify-Storefront-Access-Token': storefrontToken
  },
  resolveBodyOnly: true,
  responseType: 'json',
  retry: 2,
  timeout
})

/**
 * Get all paginated data from a query. Will execute multiple requests as
 * needed.
 */
export const queryAll = async (client, query, variables) => {
  const items = client.paginate.each('graphql.json', {
    method: 'POST',
    json: { query, variables },
    pagination: {
      transform: ({ body: { data, errors } }) => {
        if (errors) return []
        return data.data.edges
      },
      paginate: (response, allItems, currentItems) => {
        const { errors, data } = response.body
        if (errors) throw new Error(errors[ 0 ].message)

        const { pageInfo } = data.data
        if (!pageInfo.hasNextPage) return false

        const lastItem = currentItems[ currentItems.length - 1 ]
        const newVariables = { ...variables, after: lastItem.cursor }

        return {
          json: { query, variables: newVariables }
        }
      }
    }
  })

  const allNodes = []
  for await (const { node, typeName } of items) {
    if (typeName !== 'CollectionEdge') {
      allNodes.push(node)
      continue
    }

    // Currently setup for Collection.products field, but can extend this method in future, if needed
    if (!node.products.pageInfo.hasNextPage) {
      allNodes.push(node)
      continue
    }

    const lastProduct = node.products.edges[ node.products.edges.length - 1 ]
    const collectionVariables = { ...variables, handle: node.handle, after: lastProduct.cursor }

    const remainingProducts = await client.paginate.all('graphql.json', {
      method: 'POST',
      json: { query: COLLECTION_QUERY, variables: collectionVariables },
      pagination: {
        transform: ({ body: { data, errors } }) => {
          if (errors) return []
          return data.collection.products.edges
        },
        paginate: (response, allItems, currentItems) => {
          const { errors, data } = response.body
          if (errors) throw new Error(errors[ 0 ].message)

          const { pageInfo } = data.collection.products
          if (!pageInfo.hasNextPage) return false

          const lastItem = currentItems[ currentItems.length - 1 ]
          const newVariables = { ...collectionVariables, after: lastItem.cursor }

          return {
            json: { query: COLLECTION_QUERY, variables: newVariables }
          }
        }
      }
    })

    const edges = [...node.products.edges, ...remainingProducts]
    allNodes.push({ ...node, products: { edges } })
  }

  return allNodes
}
