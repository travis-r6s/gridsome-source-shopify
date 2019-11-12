import { GraphQLClient } from 'graphql-request'
import prettyjson from 'prettyjson'

/**
 * Create a Shopify Storefront GraphQL client for the provided name and token.
 */
export const createClient = ({ storeUrl, storefrontToken }) => new GraphQLClient(`${storeUrl}/api/2019-07/graphql.json`, {
  headers: {
    'X-Shopify-Storefront-Access-Token': storefrontToken
  }
})

/**
 * Print an error from a GraphQL client
 */
export const printGraphQLError = e => {
  const prettyjsonOptions = { keysColor: 'red', dashColor: 'red' }

  if (e.response && e.response.errors) { console.error(prettyjson.render(e.response.errors, prettyjsonOptions)) }

  if (e.request) console.error(prettyjson.render(e.request, prettyjsonOptions))
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
  aggregatedResponse,
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
      aggregatedResponse,
    )
  }

  return aggregatedResponse
}
