export const assertIsTrue = (condition: boolean, errorMessage = '') => {
  if (!condition) {
    throw new Error(errorMessage ?? 'Is true assertion failed')
  }
}
