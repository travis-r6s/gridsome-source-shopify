import got from 'got'

/**
 * Create a Shopify Storefront GraphQL client for the provided name and token.
 */
export const createClient = ({ storeUrl, storefrontToken }) => got.extend({
  prefixUrl: `${storeUrl}/api/2020-10`,
  headers: {
    'X-Shopify-Storefront-Access-Token': storefrontToken
  },
  resolveBodyOnly: true,
  responseType: 'json'
})

/**
 * Get all paginated data from a query. Will execute multiple requests as
 * needed.
 */
export const queryAll = async (client, query, first = 100) => {
  const items = client.paginate.each('graphql.json', {
    method: 'POST',
    json: { query, variables: { first } },
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
        const variables = { first, after: lastItem.cursor }

        return {
          json: { query, variables }
        }
      }
    }
  })

  const allNodes = []
  for await (const { node } of items) {
    allNodes.push(node)
  }
  return allNodes
}
