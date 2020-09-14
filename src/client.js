import got from 'got'

/**
 * Create a Shopify Storefront GraphQL client for the provided name and token.
 */
export const createClient = ({ storeUrl, storefrontToken }) => {
  const shopify = got.extend({
    prefixUrl: `${storeUrl}/api/2020-10`,
    headers: {
      'X-Shopify-Storefront-Access-Token': storefrontToken
    },
    resolveBodyOnly: true,
    responseType: 'json'
  })

  return {
    request: async (query, variables) => {
      const { data, errors } = await shopify.post('graphql.json', { json: { query, variables } })
      if (errors) throw new Error(errors[ 0 ].message)
      return data
    }
  }
}

/**
 * Request a query from a client.
 */
export const queryOnce = async (client, query, first = 100, after) => client.request(query, { first, after })

/**
 * Get all paginated data from a query. Will execute multiple requests as
 * needed.
 */
export const queryAll = async (
  client,
  query,
  first,
  after,
  aggregatedResponse
) => {
  const { data: { edges, pageInfo } } = await queryOnce(client, query, first, after)
  const lastNode = edges[ edges.length - 1 ]
  const nodes = edges.map(edge => edge.node)

  aggregatedResponse
    ? (aggregatedResponse = aggregatedResponse.concat(nodes))
    : (aggregatedResponse = nodes)

  if (pageInfo.hasNextPage) {
    return queryAll(
      client,
      query,
      first,
      lastNode.cursor,
      aggregatedResponse
    )
  }

  return aggregatedResponse
}
