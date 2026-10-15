// Preload for `npm run examples:live`. When XE_PROVIDERS lists provider
// accounts (comma separated), GET /providers answers with only those, so every
// leasing tutorial and job program rents from a provider known to accept
// leases. The programs stay exactly as readers see them.
//
//   XE_PROVIDERS=<account>[,<account>] npm run examples:live

const allowed = new Set(process.env['XE_PROVIDERS'].split(',').map((a) => a.trim()).filter(Boolean))
const realFetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = async (input, init) => {
  const res = await realFetch(input, init)
  const url = new globalThis.URL(input instanceof globalThis.Request ? input.url : String(input))
  if (!res.ok || !url.pathname.endsWith('/providers')) return res
  const providers = await res.json()
  return globalThis.Response.json(providers.filter((p) => allowed.has(p.account)))
}
