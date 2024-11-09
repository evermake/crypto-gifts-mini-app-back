import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
}, {
  rules: {
    'no-console': 'warn',
    'ts/consistent-type-definitions': 'off',
    'ts/no-redeclare': 'off',
  },
})
