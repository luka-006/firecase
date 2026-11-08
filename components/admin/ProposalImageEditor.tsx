'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { withoutProposalImageAt } from '@/lib/proposal-images'

type State = { error?: string; ok?: string } | null

export function ProposalImageEditor({
  id,
  images: initial,
  action,
  minImages,
  editable,
}: {
  id: number
  images: string[]
  action: (prev: State, formData: FormData) => Promise<State>
  minImages: number
  editable: boolean
}) {
  const [images, setImages] = useState(initial)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [state, formAction, pending] = useActionState(action, null)

  function remove(index: number) {
    const next = withoutProposalImageAt(images, index, minImages)
    if (!next.removed) {
      setNote('Prije uklanjanja zadnje slike dodajte novu.')
      return
    }
    setNote('')
    setImages(next.images)
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setNote('')
    try {
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body })
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload nije uspio.')
        setImages((prev) => [...prev, data.url!])
      }
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  if (!editable) {
    return (
      <div className="flex flex-wrap gap-3">
        {initial.map((src) => (
          <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative size-32 overflow-hidden rounded border border-line">
            <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
          </a>
        ))}
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="flex flex-wrap gap-3">
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="w-32">
            <a href={src} target="_blank" rel="noopener noreferrer" className="relative block size-32 overflow-hidden rounded border border-line">
              <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
            </a>
            <button
              type="button"
              className="btn-ghost btn-sm mt-2 min-h-11 w-full touch-manipulation px-2"
              onClick={() => remove(index)}
            >
              Ukloni sliku
            </button>
          </div>
        ))}
        <label className="grid size-32 cursor-pointer place-items-center rounded border border-dashed border-line text-center text-xs text-mute">
          {uploading ? 'Učitavam…' : '+ Dodaj sliku'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => onFiles(e.target.files)} disabled={uploading} />
        </label>
      </div>
      {note && <p className="text-sm text-amber-200">{note}</p>}
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-300">{state.ok}</p>}
      <button className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto" disabled={pending || uploading}>
        {pending ? 'Spremam…' : 'Spremi slike'}
      </button>
    </form>
  )
}
