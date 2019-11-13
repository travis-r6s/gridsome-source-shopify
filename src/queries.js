export const ARTICLES_QUERY = `
  query GetArticles($first: Int!, $after: String) {
    data: articles(first: $first, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          author {
            bio
            email
            firstName
            lastName
            name
          }
          blog {
            id
          }
          comments(first: 250) {
            edges {
              node {
                author {
                  email
                  name
                }
                content
                contentHtml
                id
              }
            }
          }
          content
          contentHtml
          excerpt
          excerptHtml
          id
          image {
            altText
            id
            src
          }
          publishedAt
          tags
          title
          url
        }
      }
    }
  }
`

export const BLOGS_QUERY = `
  query GetBlogs($first: Int!, $after: String) {
    data: blogs(first: $first, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          title
          url
        }
      }
    }
  }
`

export const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $after: String) {
    data: collections (first: $first, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          products(first: 250) {
            edges {
              node {
                id
              }
            }
          }
          description
          descriptionHtml
          handle
          id
          image {
            altText
            id
            originalSrc
          }
          title
          updatedAt
        }
      }
    }
  }
`

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    data: products (first: $first, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          collections (first: $first) {
            edges {
              node {
                id
              }
            }
          }
          images(first: 250) {
            edges {
              node {
                id
                altText
                originalSrc
              }
            }
          }
          variants(first: 250) {
            edges {
              node {
                availableForSale
                compareAtPrice: compareAtPriceV2
                id
                image {
                  altText
                  id
                  originalSrc
                }
                price: priceV2
                selectedOptions {
                  name
                  value
                }
                sku
                title
                weight
                weightUnit
              }
            }
          }
          availableForSale
          createdAt
          description
          descriptionHtml
          handle
          id
          onlineStoreUrl
          options {
            id
            name
            values
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          productType
          publishedAt
          tags
          title
          updatedAt
          vendor
        }
      }
    }
  }
`

export const SHOP_POLICIES_QUERY = `
  query GetPolicies {
    shop {
      privacyPolicy {
        body
        id
        title
        url
      }
      refundPolicy {
        body
        id
        title
        url
      }
      termsOfService {
        body
        id
        title
        url
      }
    }
  }
`

export const PRODUCT_TYPES_QUERY = `
  query GetProductTypes($first: Int!) {
    data: productTypes(first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node
      }
    }
  }
`

export const PAGES_QUERY = `
  query Pages ($first: Int!) {
    data: pages (first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          title
          handle
          body
          bodySummary
        }
      }
    }
  }
`
