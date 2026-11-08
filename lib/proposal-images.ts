/** Drop one thumbnail. The remaining images keep their order. The last required image stays. */
export function withoutProposalImageAt(images: string[], index: number, minImages: number) {
  if (images.length <= minImages) return { images, removed: false as const }
  if (!Number.isInteger(index) || index < 0 || index >= images.length) return { images, removed: false as const }
  return { images: images.filter((_, i) => i !== index), removed: true as const }
}

export function parseProposalImageList(raw: string, minImages: number, maxImages: number) {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return { ok: false as const, error: 'Slike nisu ispravne.' }
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    return { ok: false as const, error: 'Slike nisu ispravne.' }
  }
  const images = parsed.map((item) => item.trim()).filter(Boolean)
  if (images.length < minImages) {
    return { ok: false as const, error: 'Prije uklanjanja zadnje slike dodajte novu.' }
  }
  if (images.length > maxImages || images.some((item) => item.length < 8 || item.length > 2000)) {
    return { ok: false as const, error: 'Slike nisu ispravne.' }
  }
  if (images.some((item) => !item.startsWith('/') && !item.startsWith('http://') && !item.startsWith('https://'))) {
    return { ok: false as const, error: 'Slika mora biti adresa.' }
  }
  return { ok: true as const, images }
}
