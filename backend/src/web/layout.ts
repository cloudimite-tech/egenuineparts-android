export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Shared look for the public web pages (terms, privacy, account deletion).
export function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | AutoGuide</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F4F6;color:#111114;line-height:1.6}
header{background:linear-gradient(135deg,#161314,#231F20 60%,#3A3536);color:#fff;padding:16px 20px;border-bottom:3px solid #E5120B;font-weight:900;font-size:18px}
header span{color:#FF5A50}main{max-width:760px;margin:0 auto;padding:20px}
.card{background:#fff;border-radius:14px;padding:24px;box-shadow:0 4px 16px rgba(0,0,0,.05)}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 6px}p,li{color:#2b2b31}.muted{color:#6B6B73;font-size:13px}
label{display:block;font-weight:700;font-size:13px;margin:14px 0 6px}input[type=email],input[type=password]{width:100%;padding:12px;border:1px solid #E6E6EA;border-radius:10px;font-size:15px}
button{margin-top:18px;width:100%;padding:14px;border:0;border-radius:12px;background:#E5120B;color:#fff;font-weight:800;font-size:15px;cursor:pointer}
.ok{background:#E7F6EC;color:#16803C;padding:12px;border-radius:10px}.err{background:#FFECEA;color:#B80D07;padding:12px;border-radius:10px}
a{color:#231F20}
</style></head><body><header>Auto<span>Guide</span></header><main><div class="card">${body}</div>
<p class="muted" style="text-align:center">© ${new Date().getFullYear()} AutoGuide · <a href="/terms">Terms of Use</a> · <a href="/privacy">Privacy Policy</a> · <a href="/account/delete">Delete account</a></p></main></body></html>`;
}

export const WEB_PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
