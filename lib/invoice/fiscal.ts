import 'server-only'
import crypto from 'node:crypto'
import https from 'node:https'
import tls from 'node:tls'
import forge from 'node-forge'
import { SignedXml } from 'xml-crypto'
import { amountDot, zagrebParts } from '../money'

// Fiskalizacija računa u krajnjoj potrošnji (B2C) prema CIS-u Porezne uprave.
// Certifikat: FINA aplikacijski certifikat za fiskalizaciju (.p12) u env varijabli FISCAL_CERT_BASE64.

const ENDPOINTS = {
  test: 'https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest',
  prod: 'https://cis.porezna-uprava.hr:8449/FiskalizacijaService',
}

export type FiscalCert = {
  keyPem: string
  certPem: string
  certB64: string
  issuer: string
  serial: string
  subject: string
  validTo: Date
}

let cached: FiscalCert | null = null

export function loadCert(): FiscalCert {
  if (cached) return cached
  const b64 = process.env.FISCAL_CERT_BASE64
  if (!b64) throw new Error('FISCAL_CERT_BASE64 nije postavljen (FINA certifikat za fiskalizaciju).')
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(forge.util.decode64(b64.replace(/\s/g, ''))),
    process.env.FISCAL_CERT_PASSWORD || '',
  )
  const shrouded = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]
  const plain = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]
  const key = (shrouded?.[0] ?? plain?.[0])?.key as forge.pki.rsa.PrivateKey | undefined
  if (!key) throw new Error('U certifikatu nije pronađen privatni ključ.')
  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c)
  const cert = certs.find((c) => (c.publicKey as forge.pki.rsa.PublicKey).n.equals(key.n)) ?? certs[0]
  if (!cert) throw new Error('U certifikatu nije pronađen X509 certifikat.')
  const rdn = (attrs: forge.pki.CertificateField[]) =>
    attrs.map((a) => `${a.shortName ?? a.type}=${a.value}`).reverse().join(',')
  cached = {
    keyPem: forge.pki.privateKeyToPem(key),
    certPem: forge.pki.certificateToPem(cert),
    certB64: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()),
    issuer: rdn(cert.issuer.attributes),
    serial: BigInt('0x' + cert.serialNumber).toString(),
    subject: rdn(cert.subject.attributes),
    validTo: cert.validity.notAfter,
  }
  return cached
}

function fmt(d: Date, sep: ' ' | 'T') {
  const p = zagrebParts(d)
  return `${p.day}.${p.month}.${p.year}${sep}${p.hour}:${p.minute}:${p.second}`
}

export type FiscalReceipt = {
  oib: string
  issuedAt: Date
  seq: number
  premises: string
  device: string
  seqMode: 'P' | 'N'
  totalCents: number
  paymentCode: string // G gotovina, K kartice, C ček, T transakcijski račun, O ostalo
  operatorOib: string
}

// Zaštitni kod izdavatelja (ZKI)
export function computeZki(r: FiscalReceipt, cert = loadCert()) {
  const input = `${r.oib}${fmt(r.issuedAt, ' ')}${r.seq}${r.premises}${r.device}${amountDot(r.totalCents)}`
  const signature = crypto.createSign('RSA-SHA1').update(input).sign(cert.keyPem)
  return crypto.createHash('md5').update(signature).digest('hex')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildSignedRequest(r: FiscalReceipt, zki: string, late: boolean, cert = loadCert()) {
  const ns = 'http://www.apis-it.hr/fin/2012/types/f73'
  const body =
    `<tns:RacunZahtjev xmlns:tns="${ns}" Id="signXmlId">` +
    `<tns:Zaglavlje><tns:IdPoruke>${crypto.randomUUID()}</tns:IdPoruke><tns:DatumVrijeme>${fmt(new Date(), 'T')}</tns:DatumVrijeme></tns:Zaglavlje>` +
    `<tns:Racun>` +
    `<tns:Oib>${r.oib}</tns:Oib>` +
    `<tns:USustPdv>false</tns:USustPdv>` +
    `<tns:DatVrijeme>${fmt(r.issuedAt, 'T')}</tns:DatVrijeme>` +
    `<tns:OznSlijed>${r.seqMode}</tns:OznSlijed>` +
    `<tns:BrRac><tns:BrOznRac>${r.seq}</tns:BrOznRac><tns:OznPosPr>${esc(r.premises)}</tns:OznPosPr><tns:OznNapUr>${esc(r.device)}</tns:OznNapUr></tns:BrRac>` +
    `<tns:IznosUkupno>${amountDot(r.totalCents)}</tns:IznosUkupno>` +
    `<tns:NacinPlac>${r.paymentCode}</tns:NacinPlac>` +
    `<tns:OibOper>${r.operatorOib}</tns:OibOper>` +
    `<tns:ZastKod>${zki}</tns:ZastKod>` +
    `<tns:NakDost>${late}</tns:NakDost>` +
    `</tns:Racun>` +
    `</tns:RacunZahtjev>`

  const sig = new SignedXml({
    privateKey: cert.keyPem,
    publicCert: cert.certPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${cert.certB64}</X509Certificate>` +
      `<X509IssuerSerial><X509IssuerName>${esc(cert.issuer)}</X509IssuerName><X509SerialNumber>${cert.serial}</X509SerialNumber></X509IssuerSerial></X509Data>`,
  })
  sig.addReference({
    xpath: "//*[local-name(.)='RacunZahtjev']",
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  })
  sig.computeSignature(body, { location: { reference: "//*[local-name(.)='RacunZahtjev']", action: 'append' } })
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>' +
    sig.getSignedXml() +
    '</soapenv:Body></soapenv:Envelope>'
  )
}

function post(url: string, xml: string): Promise<string> {
  const extraCa = process.env.FISCAL_CA_PEM
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': Buffer.byteLength(xml) },
        ca: extraCa ? [...tls.rootCertificates, extraCa.replace(/\\n/g, '\n')] : undefined,
        timeout: 10000,
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve(data))
      },
    )
    req.on('timeout', () => req.destroy(new Error('CIS timeout')))
    req.on('error', reject)
    req.end(xml)
  })
}

export async function sendReceipt(r: FiscalReceipt, zki: string, late: boolean, env: 'test' | 'prod') {
  const xml = buildSignedRequest(r, zki, late)
  const res = await post(ENDPOINTS[env], xml)
  const jir = res.match(/<(?:\w+:)?Jir>([^<]+)<\/(?:\w+:)?Jir>/)?.[1]
  if (jir) return jir
  const code = res.match(/<(?:\w+:)?SifraGreske>([^<]+)</)?.[1]
  const msg = res.match(/<(?:\w+:)?PorukaGreske>([^<]+)</)?.[1]
  throw new Error(code ? `CIS ${code}: ${msg}` : `Neočekivan odgovor CIS-a: ${res.slice(0, 300)}`)
}
