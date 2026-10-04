export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center pt-16">
      <div className="w-full max-w-sm">
        <h1 className="h-display mb-8 text-center text-2xl">{title}</h1>
        {children}
      </div>
    </div>
  )
}
