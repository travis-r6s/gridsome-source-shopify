export default {
  input: 'src/index.js',
  external: ['got', 'camelcase', 'nanoid'],
  output: {
    dir: 'lib',
    format: 'cjs'
  }
}
