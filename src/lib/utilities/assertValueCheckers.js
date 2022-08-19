export const assertIsTrue = (condition, errorMessage = '') => {
  if (!condition) {
    throw new Error(errorMessage ?? 'Is true assertion failed')
  }
}
