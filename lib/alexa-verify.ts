import forge from "node-forge";
import crypto from "node:crypto";

// Amazon's request-signing requirements for a custom (non-Lambda) HTTPS
// endpoint: https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html
const VALID_CERT_HOSTNAME = "s3.amazonaws.com";
const VALID_CERT_PATH_START = "/echo.api/";
const VALID_CERT_SAN = "echo-api.amazon.com";
const TIMESTAMP_TOLERANCE_MS = 150_000;
const CERT_FETCH_TIMEOUT_MS = 5_000;

// Certs are stable and reused across many requests; a warm serverless
// instance can skip refetching. This is exactly what the alexa-verifier
// package we replaced did too — same tradeoff, just via fetch() this time.
const certCache = new Map<string, string>();

function validateCertUrl(certUrl: string) {
  const url = new URL(certUrl);
  if (url.protocol !== "https:") throw new Error("Certificate URI must use https");
  if (url.port && url.port !== "443") throw new Error("Certificate URI port must be 443");
  if (url.hostname !== VALID_CERT_HOSTNAME) throw new Error(`Certificate URI hostname must be ${VALID_CERT_HOSTNAME}`);
  if (!url.pathname.startsWith(VALID_CERT_PATH_START)) {
    throw new Error(`Certificate URI path must start with ${VALID_CERT_PATH_START}`);
  }
}

async function fetchCertPem(certUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CERT_FETCH_TIMEOUT_MS);
  try {
    // fetch() follows redirects by default — unlike raw https.get(), which
    // is what actually broke this (S3 redirected and the old library
    // treated any non-200 as an outright download failure).
    const res = await fetch(certUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to download certificate, status ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function validateCertPem(pem: string): string {
  const cert = forge.pki.certificateFromPem(pem);

  const altNameExt = cert.getExtension("subjectAltName") as forge.pki.CertificateField | null;
  const altNames = (altNameExt as { altNames?: { value: string }[] } | null)?.altNames;
  if (!altNames?.some((name) => name.value === VALID_CERT_SAN)) {
    throw new Error("Certificate is missing the required echo-api.amazon.com SAN entry");
  }

  const now = Date.now();
  if (new Date(cert.validity.notAfter).getTime() <= now) throw new Error("Certificate has expired");
  if (new Date(cert.validity.notBefore).getTime() > now) throw new Error("Certificate is not yet valid");

  return pem;
}

function validateSignature(pem: string, signature: string, rawBody: string) {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(rawBody, "utf8");
  if (!verifier.verify(pem, signature, "base64")) throw new Error("Request signature does not match");
}

function validateTimestamp(rawBody: string) {
  let parsed: { request?: { timestamp?: string } };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Request body is not valid JSON");
  }
  const timestamp = parsed.request?.timestamp ? new Date(parsed.request.timestamp).getTime() : NaN;
  if (Number.isNaN(timestamp) || Math.abs(Date.now() - timestamp) > TIMESTAMP_TOLERANCE_MS) {
    throw new Error("Request timestamp is outside the allowed tolerance");
  }
}

/** Full verification an Alexa custom-skill HTTPS endpoint must perform on every incoming request. */
export async function verifyAlexaRequest(certUrl: string, signature: string, rawBody: string): Promise<void> {
  validateCertUrl(certUrl);
  validateTimestamp(rawBody);

  let pem = certCache.get(certUrl);
  if (!pem) {
    pem = validateCertPem(await fetchCertPem(certUrl));
    certCache.set(certUrl, pem);
  }

  validateSignature(pem, signature, rawBody);
}
