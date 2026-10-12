'use client'

export function DeleteReviewButton({ id, action }: { id: number; action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Obrisati ovu recenziju? Ako obrišeš sve recenzije ove narudžbe, kupac može poslati novu preko iste poveznice.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value="delete" />
      <button className="btn-ghost btn-sm">Obriši</button>
    </form>
  )
}
