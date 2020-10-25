export default {
  input: ['src/index.js', 'src/client.js', 'src/queries.js', 'src/schema.js'],
  external: ['got', 'camelcase', 'nanoid'],
  output: {
    dir: 'lib',
    format: 'cjs'
  }
}
