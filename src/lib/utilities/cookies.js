export const getCookieValueByName = name => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts?.length === 2) {
    const cookieValue = parts?.pop()?.split(';')?.shift()

    return cookieValue
  }

  return undefined
}
