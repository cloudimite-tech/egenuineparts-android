// Web admin panel — plain HTML/CSS/JS, no build step. Talks to /api/admin/*.
export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin · AutoGuide</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#161314">
<link rel="icon" type="image/png" href="/admin/logo-mark.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="/admin/app.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
<script src="/admin/app.js" defer></script>
</head><body><div id="app"><div class="boot"><img src="/admin/logo-mark.png" alt=""><div class="spinner"></div></div></div><div id="toasts"></div><div id="modal-root"></div></body></html>`;

export const ADMIN_CSS = `
:root{
  --navy-950:#0B0A0A;--navy-900:#131112;--navy-800:#161314;--navy:#231F20;--navy-500:#5A5455;--navy-100:#ECEBEB;--navy-50:#F6F5F5;
  --red:#E5120B;--red-600:#C40F08;--red-50:#FFECEA;
  --bg:#F4F5F9;--card:#FFFFFF;--line:#E6E7EF;--line-2:#F0F1F6;--text:#0F1024;--muted:#64667E;--faint:#9C9EB3;
  --ok:#0F7B58;--ok-bg:#E5F5EE;--warn:#B25B05;--warn-bg:#FEF2E1;--bad:#C21D2E;--bad-bg:#FDEBEE;--info:#2D58D6;--info-bg:#EAF0FE;--grey-bg:#EEEFF4;
  --surface:#FFFFFF;--surface-2:#FAFAFD;--hover:#FAFAFE;--sk1:#EEEFF5;--sk2:#F7F7FB;--text-2:#3A3C55;--link:#231F20;--danger-line:#F3C9CF;--topbar:rgba(244,245,249,.85);--focus:rgba(35,31,32,.12);
  --r:14px;--r-lg:18px;--shadow:0 1px 2px rgba(16,17,52,.04),0 4px 16px rgba(16,17,52,.06);--shadow-lg:0 20px 60px rgba(16,17,52,.18);
}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
svg.i{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:middle}
.boot{min-height:100vh;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center}.boot img{width:52px}
.spinner{width:26px;height:26px;border:3px solid var(--navy-100);border-top-color:var(--link);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ---------- buttons & inputs ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:10px;padding:9px 15px;font:600 13.5px Inter,sans-serif;cursor:pointer;transition:background .15s,box-shadow .15s,transform .05s;white-space:nowrap;text-decoration:none!important}
.btn:active{transform:translateY(1px)}.btn:disabled{opacity:.55;cursor:default}
.btn-primary{background:var(--red);color:#fff;box-shadow:0 1px 2px rgba(229,18,11,.3)}.btn-primary:hover{background:var(--red-600)}
.btn-navy{background:var(--navy);color:#fff}.btn-navy:hover{background:var(--navy-800)}
.btn-ok{background:var(--ok);color:#fff}.btn-ok:hover{filter:brightness(.95)}
.btn-ghost{background:var(--surface);color:var(--text);border-color:var(--line)}.btn-ghost:hover{background:var(--navy-50)}
.btn-danger{background:var(--surface);color:var(--bad);border-color:var(--danger-line)}.btn-danger:hover{background:var(--bad-bg)}
.btn-link{background:none;border:0;color:var(--link);padding:0}.btn-sm{padding:6px 11px;font-size:12.5px;border-radius:8px}.btn-block{width:100%;padding:12px}
.field{margin-bottom:14px}.field label{display:block;font-weight:600;font-size:12.5px;color:var(--text-2);margin-bottom:6px}
.input,input.input,textarea.input,select.input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:14px Inter,sans-serif;color:var(--text);background:var(--surface);transition:border .15s,box-shadow .15s;outline:none}
.input:focus{border-color:var(--navy-500);box-shadow:0 0 0 4px var(--focus)}.input:disabled{background:var(--bg);color:var(--muted)}
textarea.input{min-height:96px;resize:vertical}
.input-icon{position:relative}.input-icon svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--faint)}.input-icon .input{padding-left:38px}
.otp{font-size:24px!important;letter-spacing:10px;text-align:center;font-weight:700!important}
.hint{font-size:12px;color:var(--muted);margin-top:6px}

/* ---------- login ---------- */
.auth{min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr}
.auth-brand{position:relative;overflow:hidden;background:radial-gradient(1200px 600px at -10% -10%,#3A3536 0,transparent 60%),linear-gradient(160deg,var(--navy-800),var(--navy-950));color:#fff;padding:48px;display:flex;flex-direction:column;justify-content:space-between}
.auth-brand:after{content:"";position:absolute;right:-120px;bottom:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(229,18,11,.45),transparent 65%)}
.auth-logo{display:flex;align-items:center;gap:12px;font-weight:800;font-size:18px;letter-spacing:-.2px}.auth-logo img{width:40px;height:40px;background:#fff;border-radius:12px;padding:5px}
.auth-copy{position:relative;z-index:1;max-width:420px}.auth-copy h1{font-size:34px;line-height:1.15;margin:0 0 14px;letter-spacing:-.6px}.auth-copy p{color:rgba(255,255,255,.72);font-size:15px;margin:0}
.auth-points{display:grid;gap:12px;margin-top:28px}.auth-points div{display:flex;gap:10px;align-items:center;color:rgba(255,255,255,.85)}
.auth-points svg{color:#FF5A50}
.auth-foot{position:relative;z-index:1;color:rgba(255,255,255,.5);font-size:12px}
.auth-form{display:flex;align-items:center;justify-content:center;padding:32px;background:var(--surface)}
.auth-card{width:100%;max-width:380px}.auth-card .wm{height:34px;margin-bottom:30px}
.auth-card h2{font-size:24px;letter-spacing:-.4px;margin:0 0 6px}.auth-card .lead{color:var(--muted);margin:0 0 24px}
.steps{display:flex;gap:6px;margin-bottom:20px}.steps span{height:4px;flex:1;border-radius:4px;background:var(--line)}.steps span.on{background:var(--red)}
.qr-box{display:flex;justify-content:center;padding:14px;border:1px solid var(--line);border-radius:var(--r);margin-bottom:12px;background:#fff}.qr-box svg{width:190px;height:190px}
.secret{font:600 12.5px ui-monospace,Menlo,monospace;background:var(--navy-50);color:var(--link);padding:10px 12px;border-radius:10px;word-break:break-all;text-align:center;margin-bottom:16px}
.alert{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:10px;font-size:13px;margin-bottom:14px}.alert svg{margin-top:1px}
.alert-bad{background:var(--bad-bg);color:var(--bad)}.alert-ok{background:var(--ok-bg);color:var(--ok)}.alert-warn{background:var(--warn-bg);color:var(--warn)}.alert-info{background:var(--info-bg);color:var(--info)}

/* ---------- shell ---------- */
.shell{display:flex;min-height:100vh}
.side{width:260px;flex:none;background:linear-gradient(180deg,var(--navy-800),var(--navy-950));color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding:18px 14px}
.side-brand{display:flex;align-items:center;gap:11px;padding:6px 8px 18px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:14px}
.side-brand img{width:36px;height:36px;background:#fff;border-radius:10px;padding:4px}
.side-brand b{display:block;font-size:15px;letter-spacing:-.2px}.side-brand small{display:inline-block;margin-top:2px;font-size:10.5px;font-weight:700;letter-spacing:.8px;color:#FF8A82;background:rgba(229,18,11,.22);padding:1px 7px;border-radius:999px}
.nav-label{font-size:10.5px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.4);padding:12px 10px 6px}
.nav a{display:flex;align-items:center;gap:11px;color:rgba(255,255,255,.72);padding:10px 11px;border-radius:10px;font-weight:500;margin-bottom:2px;position:relative;text-decoration:none!important;transition:background .15s,color .15s}
.nav a:hover{background:rgba(255,255,255,.06);color:#fff}
.nav a.active{background:rgba(255,255,255,.1);color:#fff;font-weight:600}
.nav a.active:before{content:"";position:absolute;left:-14px;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--red)}
.nav .count{margin-left:auto;background:var(--red);color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;min-width:22px;text-align:center}
.side-user{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px 8px 4px;border-top:1px solid rgba(255,255,255,.08)}
.side-user .who{flex:1;min-width:0}.side-user b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.side-user span{font-size:11.5px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:0;background:transparent;color:inherit;cursor:pointer}.icon-btn:hover{background:rgba(255,255,255,.1)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:14px 28px;background:var(--topbar);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}
.topbar .crumbs{font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:6px}
.topbar .grow{flex:1}.env{font-size:11px;font-weight:700;letter-spacing:.6px;padding:3px 9px;border-radius:999px}.env-live{background:var(--ok-bg);color:var(--ok)}.env-local{background:var(--warn-bg);color:var(--warn)}
.menu-btn{display:none;color:var(--text)}.menu-btn:hover{background:var(--navy-50)}
.content{padding:26px 28px 48px;max-width:1240px;width:100%}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.page-head h1{font-size:24px;letter-spacing:-.5px;margin:0}.page-head p{color:var(--muted);margin:4px 0 0}

/* ---------- cards, stats ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.card-pad{padding:20px}.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line-2)}
.card-head h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}.card-head h3 svg{color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px}
.stat{padding:18px;display:flex;gap:14px;align-items:flex-start;cursor:default}.stat.link{cursor:pointer;transition:transform .15s,box-shadow .15s}.stat.link:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(16,17,52,.1)}
.tile{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}
.tile svg{width:20px;height:20px}.t-navy{background:var(--navy-100);color:var(--link)}.t-red{background:var(--red-50);color:var(--red)}.t-ok{background:var(--ok-bg);color:var(--ok)}.t-warn{background:var(--warn-bg);color:var(--warn)}.t-info{background:var(--info-bg);color:var(--info)}.t-grey{background:var(--grey-bg);color:var(--muted)}
.stat .v{font-size:26px;font-weight:800;letter-spacing:-.6px;line-height:1.1}.stat .l{color:var(--muted);font-size:12.5px;margin-top:3px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.grid3{display:grid;grid-template-columns:2fr 1fr;gap:18px}
.stack{display:grid;gap:18px}
.bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--line-2);margin:6px 0 14px}.bar span{display:block;height:100%}
.legend{display:grid;gap:8px}.legend div{display:flex;align-items:center;gap:8px;font-size:13px}.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}.legend b{margin-left:auto}

/* ---------- toolbar, tabs ---------- */
.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}.toolbar .grow{flex:1}
.seg{display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:4px;gap:2px;box-shadow:var(--shadow)}
.seg button{border:0;background:transparent;font:600 13px Inter,sans-serif;color:var(--muted);padding:7px 13px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s,color .15s}
.seg button:hover{color:var(--text)}.seg button.on{background:var(--navy-800);color:#fff;box-shadow:0 2px 8px rgba(22,19,20,.25)}
.seg .n{font-size:11px;background:var(--grey-bg);color:var(--muted);border-radius:999px;padding:0 7px;line-height:18px}.seg button.on .n{background:rgba(255,255,255,.18);color:#fff}
.search{position:relative;min-width:280px}.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--faint)}.search .input{padding-left:38px;box-shadow:var(--shadow)}
.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 12px;font:500 12.5px Inter,sans-serif;color:var(--text-2);cursor:pointer;transition:all .15s}.chip:hover{border-color:var(--navy-500);color:var(--link)}.chip.on{background:var(--navy-100);border-color:transparent;color:var(--link);font-weight:600}

/* ---------- tables ---------- */
.table-wrap{overflow:auto;border-radius:var(--r-lg)}
table.table{width:100%;border-collapse:separate;border-spacing:0;font-size:13.5px}
.table th{position:sticky;top:0;background:var(--surface-2);text-align:left;font-size:11.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);padding:12px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
.table td{padding:13px 16px;border-bottom:1px solid var(--line-2);vertical-align:middle}
.table tr:last-child td{border-bottom:0}.table tbody tr{transition:background .12s}.table tbody tr:hover{background:var(--hover)}
.table tr.click{cursor:pointer}.table .sub{font-size:12px;color:var(--muted);margin-top:1px}.table td.r{text-align:right;white-space:nowrap}
.person{display:flex;align-items:center;gap:11px;min-width:0}.person b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av{width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;letter-spacing:.3px}
.av.lg{width:56px;height:56px;font-size:19px;border-radius:16px}
.chev{color:var(--faint)}tr:hover .chev{color:var(--link)}

/* ---------- badges ---------- */
.badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 10px 3px 8px;border-radius:999px;white-space:nowrap;line-height:18px}
.badge:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.b-ok{background:var(--ok-bg);color:var(--ok)}.b-warn{background:var(--warn-bg);color:var(--warn)}.b-bad{background:var(--bad-bg);color:var(--bad)}.b-grey{background:var(--grey-bg);color:var(--muted)}.b-info{background:var(--info-bg);color:var(--info)}.b-navy{background:var(--navy-100);color:var(--link)}
.tag{display:inline-flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:var(--navy-50);color:var(--link)}

/* ---------- empty, skeleton, error ---------- */
.empty{text-align:center;padding:56px 20px;color:var(--muted)}
.empty .ic{width:64px;height:64px;border-radius:20px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:var(--navy-50);color:var(--link)}
.empty .ic svg{width:28px;height:28px}.empty h4{margin:0 0 4px;color:var(--text);font-size:15px}.empty p{margin:0;font-size:13px}
.sk{background:linear-gradient(90deg,var(--sk1) 0,var(--sk2) 40%,var(--sk1) 80%);background-size:600px 100%;animation:sh 1.2s linear infinite;border-radius:8px}
@keyframes sh{from{background-position:-300px 0}to{background-position:300px 0}}
.sk-row{display:flex;gap:14px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line-2)}

/* ---------- list items (overview) ---------- */
.list-item{display:flex;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid var(--line-2);cursor:pointer;transition:background .12s}
.list-item:hover{background:var(--hover)}.list-item .grow{flex:1;min-width:0}.list-item b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.list-item small{color:var(--muted);font-size:12px}
.hero{position:relative;overflow:hidden;border-radius:var(--r-lg);padding:24px 26px;margin-bottom:22px;color:#fff;background:radial-gradient(700px 300px at 100% 0,rgba(229,18,11,.45),transparent 60%),linear-gradient(135deg,var(--navy-800),var(--navy-950));box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.hero h2{margin:0 0 4px;font-size:21px;letter-spacing:-.3px}.hero p{margin:0;color:rgba(255,255,255,.72)}.hero .grow{flex:1;min-width:240px}
.hero .btn-ghost{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.18)}.hero .btn-ghost:hover{background:rgba(255,255,255,.18)}

/* ---------- detail page ---------- */
.back{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-weight:600;font-size:13px;background:none;border:0;cursor:pointer;padding:0;margin-bottom:14px}.back:hover{color:var(--link)}
.detail-head{padding:22px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
.detail-head h1{margin:0;font-size:22px;letter-spacing:-.4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.detail-head .meta{color:var(--muted);font-size:13px;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}.detail-head .meta span{display:inline-flex;align-items:center;gap:5px}.detail-head .meta svg{width:14px;height:14px}
.detail{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
.sticky{position:sticky;top:84px}
.kv{display:grid;grid-template-columns:150px 1fr;gap:0}.kv>div{padding:10px 0;border-bottom:1px dashed var(--line)}.kv>div:nth-last-child(-n+2){border-bottom:0}
.kv .k{color:var(--muted);font-size:13px}.kv .v{font-weight:500;word-break:break-word}.mono{font-family:ui-monospace,Menlo,monospace;font-size:13px;letter-spacing:.3px}
.docs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.doc{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--surface);cursor:zoom-in;transition:transform .15s,box-shadow .15s}.doc:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.doc .ph{height:150px;background:var(--navy-50) center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:var(--link)}.doc .ph svg{width:34px;height:34px}
.doc .cap{padding:9px 11px;font-size:12.5px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:6px}.doc .cap span{color:var(--muted);font-weight:500;font-size:11.5px}
.doc.missing{cursor:default;border-style:dashed}.doc.missing .ph{background:var(--surface-2);color:var(--faint)}.doc.missing:hover{transform:none;box-shadow:none}
.map{height:300px;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);z-index:0}
.check{display:grid;gap:10px}.check label{display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer;padding:9px 10px;border-radius:10px;border:1px solid var(--line-2);transition:background .12s}.check label:hover{background:var(--navy-50)}
.check input{margin-top:2px;accent-color:var(--ok);width:16px;height:16px;flex:none}
.progress{height:6px;border-radius:999px;background:var(--line-2);overflow:hidden;margin:4px 0 14px}.progress span{display:block;height:100%;background:var(--ok);transition:width .25s}
.note{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:10px;font-size:13px;margin-top:14px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;margin-right:4px}

/* ---------- reports ---------- */
.report{padding:18px 20px;margin-bottom:14px}
.report-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.report-top .when{margin-left:auto;color:var(--faint);font-size:12px}
.report h4{margin:12px 0 6px;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.quote{border-left:3px solid var(--navy-100);background:var(--surface-2);padding:10px 14px;border-radius:0 10px 10px 0;color:var(--text-2);white-space:pre-wrap;font-size:13px;margin:8px 0;max-height:160px;overflow:auto}
.people{display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin-top:10px}.people span{display:inline-flex;align-items:center;gap:6px}.people svg{width:14px;height:14px}
.report-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--line-2)}.report-actions .input{flex:1;min-width:200px;padding:8px 11px}

/* ---------- audit timeline ---------- */
.tl{position:relative;padding:6px 20px 10px}
.tl-day{font-size:11.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--faint);margin:16px 0 6px 46px}
.tl-item{position:relative;display:flex;gap:14px;padding:9px 0}
.tl-item:before{content:"";position:absolute;left:15px;top:40px;bottom:-9px;width:2px;background:var(--line-2)}.tl-item:last-child:before{display:none}
.tl-ic{width:32px;height:32px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center}.tl-ic svg{width:16px;height:16px}
.tl-body{flex:1;min-width:0;padding-top:5px}.tl-body b{font-weight:600}.tl-body .sub{font-size:12px;color:var(--muted);margin-top:2px;word-break:break-all}.tl-time{color:var(--faint);font-size:12px;padding-top:6px;white-space:nowrap}

/* ---------- settings ---------- */
.settings{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px;align-items:start}
.set-nav{position:sticky;top:84px;display:grid;gap:2px}.set-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;color:var(--text-2);font-weight:500;text-decoration:none!important}.set-nav a:hover{background:var(--surface)}.set-nav a.on{background:var(--surface);color:var(--link);font-weight:600;box-shadow:var(--shadow)}
.set-sec{padding:0;margin-bottom:18px;scroll-margin-top:84px}.set-sec .sh{padding:18px 22px;border-bottom:1px solid var(--line-2);display:flex;gap:14px;align-items:flex-start}.set-sec .sh h3{margin:0;font-size:15px}.set-sec .sh p{margin:2px 0 0;color:var(--muted);font-size:13px}
.set-sec .sb{padding:20px 22px}.set-sec .sf{padding:14px 22px;background:var(--surface-2);border-top:1px solid var(--line-2);border-radius:0 0 var(--r-lg) var(--r-lg);display:flex;align-items:center;gap:12px;justify-content:flex-end}.set-sec .sf .hint{margin:0 auto 0 0}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.profile-card{display:flex;gap:16px;align-items:center;margin-bottom:18px}.profile-card b{font-size:16px;display:block}.profile-card span{color:var(--muted);font-size:13px}
.meter{display:flex;gap:4px;margin-top:8px}.meter i{flex:1;height:4px;border-radius:4px;background:var(--line)}.meter.s1 i:nth-child(-n+1){background:var(--bad)}.meter.s2 i:nth-child(-n+2){background:var(--warn)}.meter.s3 i:nth-child(-n+3){background:#3BA776}.meter.s4 i{background:var(--ok)}
.danger-zone{border-color:var(--danger-line)}

/* ---------- modal, lightbox, toasts ---------- */
.modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(14,13,51,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade .15s ease-out}
.modal{background:var(--surface);border-radius:20px;box-shadow:var(--shadow-lg);width:100%;max-width:460px;animation:pop .18s ease-out;overflow:hidden}
.modal-b{padding:24px}.modal-ic{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}.modal-ic svg{width:22px;height:22px}
.modal h3{margin:0 0 6px;font-size:18px;letter-spacing:-.2px}.modal p.lead{margin:0 0 16px;color:var(--muted)}
.modal-f{display:flex;gap:10px;justify-content:flex-end;padding:14px 24px;background:var(--surface-2);border-top:1px solid var(--line-2)}
.modal .chips{margin-bottom:12px}
.lightbox{position:fixed;inset:0;z-index:110;background:rgba(8,8,25,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;animation:fade .15s}
.lightbox img{max-width:min(1100px,100%);max-height:calc(100vh - 120px);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.5);background:#fff}
.lightbox iframe{width:min(1000px,100%);height:calc(100vh - 120px);border:0;border-radius:12px;background:#fff}
.lb-bar{display:flex;align-items:center;gap:10px;color:#fff;margin-bottom:14px;width:min(1100px,100%)}.lb-bar b{flex:1}.lb-bar .icon-btn{color:#fff}.lb-bar a{color:#fff}
@keyframes fade{from{opacity:0}}@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}}
#toasts{position:fixed;right:20px;bottom:20px;z-index:200;display:grid;gap:10px}
.toast{display:flex;align-items:center;gap:10px;background:var(--navy-950);color:#fff;padding:12px 16px 12px 14px;border-radius:12px;box-shadow:var(--shadow-lg);font-size:13.5px;font-weight:500;min-width:260px;max-width:400px;animation:pop .2s ease-out}
.toast .ti{width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none}.toast .ti svg{width:14px;height:14px}
.toast.ok .ti{background:#16A673}.toast.bad .ti{background:var(--red)}.toast.info .ti{background:var(--navy-500)}
.toast.out{opacity:0;transform:translateY(6px);transition:all .25s}
.scrim{display:none}

/* ---------- responsive ---------- */
@media (max-width:1180px){.detail{grid-template-columns:1fr}.sticky{position:static}.docs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:980px){
  .side{position:fixed;left:0;top:0;z-index:60;transform:translateX(-100%);transition:transform .22s ease;box-shadow:var(--shadow-lg)}
  .shell.open .side{transform:none}.shell.open .scrim{display:block;position:fixed;inset:0;z-index:55;background:rgba(14,13,51,.45)}
  .menu-btn{display:inline-flex}.topbar{padding:12px 16px}.content{padding:20px 16px 40px}
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}.grid2,.grid3{grid-template-columns:1fr}
  .auth{grid-template-columns:1fr}.auth-brand{display:none}
  .settings{grid-template-columns:1fr}.set-nav{position:static;display:flex;overflow:auto}.set-nav a{white-space:nowrap}
  .search{min-width:0;flex:1}
}
@media (max-width:560px){.stats{grid-template-columns:1fr}.row2{grid-template-columns:1fr}.kv{grid-template-columns:1fr}.kv .k{border-bottom:0!important;padding-bottom:0}.docs{grid-template-columns:1fr 1fr}.page-head h1{font-size:21px}.table .hide-sm{display:none}}
.doc .ph img{width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:560px){.tfa-grid{grid-template-columns:1fr!important}.qr-box svg{width:160px;height:160px}}
.grid3{align-items:start}.table td svg.i{width:15px;height:15px}.table td.nowrap,.table .nowrap{white-space:nowrap}
.meter{margin:-6px 0 14px}
.env{white-space:nowrap}
@media (max-width:560px){
  .stats{grid-template-columns:1fr 1fr!important;gap:10px}.stat{flex-direction:column;gap:10px;padding:14px}.stat .v{font-size:22px}
  .toolbar .search{flex:1 1 100%!important;max-width:none!important}
  #toasts{left:16px;right:16px;bottom:16px}.toast{min-width:0;max-width:none}
  .topbar .crumbs{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.topbar .crumbs>span:first-child,.topbar .crumbs>svg:first-of-type{display:none}
  .detail-head{align-items:flex-start;padding:18px}.hero{padding:20px}.doc .cap span{display:none}
}
.lb-bar .btn{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22);color:#fff}.lb-bar .btn:hover{background:rgba(255,255,255,.2)}

/* ---------- dark theme ---------- */
html[data-theme=dark]{color-scheme:dark;
  --navy-50:#1D1A1A;--navy-100:#2A2626;--navy-500:#8A8384;--navy:#4A4445;--navy-800:#2E2A2B;
  --red:#F0291F;--red-600:#FF4A40;--red-50:#3A1614;
  --bg:#0D0C0C;--card:#171515;--surface:#171515;--surface-2:#1C1919;--hover:#1F1C1C;--line:#2A2626;--line-2:#221F1F;
  --text:#F1EEEE;--text-2:#D9D3D3;--muted:#A39D9D;--faint:#736D6D;--link:#EDE8E8;
  --ok:#3BB273;--ok-bg:#12291D;--warn:#F0A54A;--warn-bg:#33240F;--bad:#FF6B6B;--bad-bg:#3A1517;--info:#7AA2F7;--info-bg:#142240;--grey-bg:#262222;
  --danger-line:#5A2226;--topbar:rgba(13,12,12,.82);--focus:rgba(240,41,31,.22);--sk1:#1C1919;--sk2:#272323;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.35);--shadow-lg:0 24px 70px rgba(0,0,0,.6);
}
html[data-theme=dark] .btn-navy{background:#3A3536}html[data-theme=dark] .btn-navy:hover{background:#4A4445}
html[data-theme=dark] .seg button.on{background:#F1EEEE;color:#111;box-shadow:none}html[data-theme=dark] .seg button.on .n{background:rgba(0,0,0,.12);color:#111}
html[data-theme=dark] .chip.on{background:#F1EEEE;color:#111}
html[data-theme=dark] .nav a.active{background:rgba(255,255,255,.08)}
html[data-theme=dark] .wm-light{display:block}html[data-theme=dark] .wm-dark{display:none}
.wm-light{display:none}
html[data-theme=dark] .leaflet-tile{filter:brightness(.75) contrast(1.1) saturate(.8)}
html[data-theme=dark] .modal-backdrop{background:rgba(0,0,0,.65)}
html[data-theme=dark] .toast{background:#262222;border:1px solid #332E2E}
html[data-theme=dark] .hero{box-shadow:none;border:1px solid #2A2626}
html,body{transition:background-color .2s}
.theme-btn svg{transition:transform .3s}.theme-btn:hover svg{transform:rotate(20deg)}
.theme-seg{display:inline-flex;gap:6px;flex-wrap:wrap}.theme-seg button{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:12px;padding:10px 16px;font:600 13.5px Inter,sans-serif;cursor:pointer}
.theme-seg button.on{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50)}
`;

export const ADMIN_JS = `
'use strict';
(function () {
  var TOKEN_KEY = 'gp_admin_session';
  var app = document.getElementById('app');
  function ssGet() { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function ssSet(v) { try { if (v) sessionStorage.setItem(TOKEN_KEY, v); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* private mode */ } }
  var state = { token: ssGet(), admin: null, view: 'overview', arg: null, stats: null };
  var host = location.hostname;
  var IS_LOCAL = host === 'localhost' || host.indexOf('127.') === 0 || host.indexOf('192.168.') === 0 || host.indexOf('10.') === 0 || host.slice(-6) === '.local';

  // ---------- light / dark theme ----------
  var THEME_KEY = 'ag_admin_theme';
  function themePref() { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; } }
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() { var p = themePref(); return p === 'system' ? (mql && mql.matches ? 'dark' : 'light') : p; }
  function applyTheme() {
    var t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', t === 'dark' ? '#0D0C0C' : '#161314');
    var b = document.getElementById('theme-btn'); if (b) b.innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
  }
  function setTheme(p) { try { localStorage.setItem(THEME_KEY, p); } catch (e) { /* private mode */ } applyTheme(); }
  if (mql && mql.addEventListener) mql.addEventListener('change', function () { if (themePref() === 'system') applyTheme(); });

  // ---------- icons (Feather/Lucide style, inline so the CSP stays strict) ----------
  var I = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v1a3 3 0 0 0 6 0V9m0 1a3 3 0 0 0 6 0V9m0 1a3 3 0 0 0 6 0V9"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    alertc: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    okc: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    chev: '<polyline points="9 18 15 12 9 6"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    pkg: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    pause: '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>',
    brief: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    idcard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    drop: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    snow: '<line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/>',
    car: '<path d="M3 17v-6l2.5-5h13L21 11v6"/><path d="M3 17h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  };
  function ic(name, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || '') + '</svg>'; }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(d) { return d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }
  function day(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
  function time(d) { return d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''; }
  function ago(d) {
    if (!d) return '—';
    var s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 45) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var dd = Math.round(h / 24); if (dd < 7) return dd + (dd === 1 ? ' day ago' : ' days ago');
    return day(d);
  }
  function initials(name) {
    var p = String(name || '?').trim().split(' ').filter(Boolean);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  var AV = ['#231F20', '#E5120B', '#0F7B58', '#C2620A', '#2D58D6', '#6D3FD1', '#0E7490', '#B8336A'];
  function av(name, cls) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return '<div class="av' + (cls ? ' ' + cls : '') + '" style="background:' + AV[h % AV.length] + '">' + esc(initials(name)) + '</div>';
  }
  var BADGES = {
    PENDING: ['b-warn', 'Pending review'], APPROVED: ['b-ok', 'Approved'], REJECTED: ['b-bad', 'Rejected'], SUSPENDED: ['b-grey', 'Suspended'],
    OPEN: ['b-warn', 'Open'], RESOLVED: ['b-ok', 'Resolved'], DISMISSED: ['b-grey', 'Dismissed'], BANNED: ['b-bad', 'Banned'], ACTIVE: ['b-ok', 'Active']
  };
  function badge(s, label) { var b = BADGES[s] || ['b-grey', s]; return '<span class="badge ' + b[0] + '">' + esc(label || b[1]) + '</span>'; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
  function $(sel) { return app.querySelector(sel); }
  function on(sel, ev, fn) { app.querySelectorAll(sel).forEach(function (el) { el.addEventListener(ev, fn); }); }
  function joinAddr(a) { return a.filter(Boolean).join(', '); }
  function empty(icon, title, text) { return '<div class="empty"><div class="ic">' + ic(icon) + '</div><h4>' + esc(title) + '</h4><p>' + esc(text || '') + '</p></div>'; }
  function errBox(msg) { return '<div class="alert alert-bad">' + ic('alertc') + '<div>' + esc(msg) + '</div></div>'; }
  function skRows(n, cols) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) {
      out += '<div class="sk-row"><div class="sk" style="width:36px;height:36px;border-radius:50%"></div><div style="flex:1"><div class="sk" style="height:12px;width:' + (30 + (i * 13) % 40) + '%;margin-bottom:8px"></div><div class="sk" style="height:10px;width:' + (20 + (i * 7) % 25) + '%"></div></div>' + (cols === false ? '' : '<div class="sk" style="height:22px;width:90px;border-radius:999px"></div>') + '</div>';
    }
    return '<div class="card">' + out + '</div>';
  }

  // ---------- toasts ----------
  function toast(msg, kind) {
    kind = kind || 'ok';
    var root = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = '<span class="ti">' + ic(kind === 'ok' ? 'check' : kind === 'bad' ? 'x' : 'info') + '</span><span>' + esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, 3800);
  }

  // ---------- modal (replaces confirm/prompt) ----------
  function modal(o) {
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      var tone = o.tone || 'navy';
      var toneCls = { bad: 't-red', ok: 't-ok', warn: 't-warn', navy: 't-navy' }[tone];
      var inp = '';
      if (o.input) {
        inp = (o.input.chips ? '<div class="chips">' + o.input.chips.map(function (c) { return '<button type="button" class="chip" data-chip="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '') +
          '<div class="field"><label>' + esc(o.input.label || 'Reason') + '</label><textarea class="input" id="m-in" placeholder="' + esc(o.input.placeholder || '') + '">' + esc(o.input.value || '') + '</textarea>' +
          (o.input.hint ? '<div class="hint">' + esc(o.input.hint) + '</div>' : '') + '</div>';
      }
      root.innerHTML = '<div class="modal-backdrop"><form class="modal" role="dialog" aria-modal="true"><div class="modal-b"><div class="modal-ic tile ' + toneCls + '">' + ic(o.icon || 'info') + '</div><h3>' + esc(o.title) + '</h3>' +
        (o.text ? '<p class="lead">' + esc(o.text) + '</p>' : '') + inp + '<div id="m-err"></div></div><div class="modal-f"><button type="button" class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn ' + (o.confirmClass || 'btn-navy') + '" id="m-ok">' + esc(o.confirm || 'Confirm') + '</button></div></form></div>';
      var back = root.querySelector('.modal-backdrop');
      var ta = root.querySelector('#m-in');
      function close(v) { document.removeEventListener('keydown', key); root.innerHTML = ''; resolve(v); }
      function key(e) { if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', key);
      back.addEventListener('mousedown', function (e) { if (e.target === back) close(null); });
      root.querySelector('#m-cancel').addEventListener('click', function () { close(null); });
      root.querySelectorAll('[data-chip]').forEach(function (b) {
        b.addEventListener('click', function () {
          root.querySelectorAll('[data-chip]').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); ta.value = b.getAttribute('data-chip'); ta.focus();
        });
      });
      root.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!ta) return close(true);
        var v = ta.value.trim();
        if (o.input.required !== false && !v) { root.querySelector('#m-err').innerHTML = errBox('Please add a reason.'); ta.focus(); return; }
        close(v);
      });
      setTimeout(function () { (ta || root.querySelector('#m-ok')).focus(); }, 30);
    });
  }

  function lightbox(url, label, isPdf) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="lightbox"><div class="lb-bar"><b>' + esc(label) + '</b><a class="btn btn-sm btn-ghost" href="' + esc(url) + '" target="_blank" rel="noopener">' + ic('ext') + ' Open in new tab</a><button class="icon-btn" id="lb-x" aria-label="Close">' + ic('x') + '</button></div>' +
      (isPdf ? '<iframe src="' + esc(url) + '" title="' + esc(label) + '"></iframe>' : '<img src="' + esc(url) + '" alt="' + esc(label) + '">') + '</div>';
    var lb = root.querySelector('.lightbox');
    function close() { document.removeEventListener('keydown', key); root.innerHTML = ''; }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    root.querySelector('#lb-x').addEventListener('click', close);
  }

  // ---------- API ----------
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    return fetch('/api' + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.status === 401 && state.token && path.indexOf('/admin/auth/login') !== 0) { signOut('Your session ended. Please sign in again.'); throw new Error('Signed out'); }
          if (!r.ok) { var m = data && data.message; throw new Error(Array.isArray(m) ? m[0] : (m || 'Something went wrong. Please try again.')); }
          return data;
        });
      }, function () { throw new Error('Can’t reach the server. Check your connection.'); });
  }
  function busy(btn, label) {
    if (!btn) return function () {};
    var html = btn.innerHTML; btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:15px;height:15px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:currentColor"></span>' + (label ? ' ' + esc(label) : '');
    return function () { btn.disabled = false; btn.innerHTML = html; };
  }

  function signOut(msg) {
    ssSet(null); state.token = null; state.admin = null; state.stats = null;
    if (location.hash) history.replaceState(null, '', location.pathname);
    renderLogin(msg);
  }

  // ---------- sign in (password + authenticator) ----------
  function renderLogin(msg, step) {
    step = step || {};
    var body, stepNo = 1;
    if (step.setup) {
      stepNo = 2;
      body = '<h2>Secure your account</h2><p class="lead">Scan this QR code with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code.</p>' +
        '<div class="qr-box">' + step.setup.qrSvg + '</div><div class="secret" title="Setup key">' + esc(step.setup.secret) + '</div>' +
        '<div class="field"><label for="code">6-digit code</label><input class="input otp" id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" required></div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + ic('shield') + ' Confirm & sign in</button>';
    } else if (step.needCode) {
      stepNo = 2;
      body = '<h2>Two-step verification</h2><p class="lead">Open your authenticator app and enter the 6-digit code for AutoGuide.</p>' +
        '<div class="field"><label for="code">Authentication code</label><input class="input otp" id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" required></div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + ic('shield') + ' Verify & sign in</button>' +
        '<p style="text-align:center;margin:16px 0 0"><button type="button" class="btn-link" id="restart">' + ic('back') + ' Use a different account</button></p>';
    } else {
      body = '<h2>Welcome back</h2><p class="lead">Sign in to the admin console to continue.</p>' +
        '<div class="field"><label for="email">Email address</label><div class="input-icon">' + ic('mail') + '<input class="input" id="email" type="email" autocomplete="username" placeholder="you@autoguide.lk" required></div></div>' +
        '<div class="field"><label for="password">Password</label><div class="input-icon">' + ic('lock') + '<input class="input" id="password" type="password" autocomplete="current-password" placeholder="••••••••••" required></div></div>' +
        '<button class="btn btn-primary btn-block" type="submit">Continue ' + ic('chev') + '</button>';
    }
    app.innerHTML = '<div class="auth"><aside class="auth-brand"><div class="auth-logo"><img src="/admin/logo-mark.png" alt="">AutoGuide</div>' +
      '<div class="auth-copy"><h1>The control room for Sri Lanka’s parts marketplace.</h1><p>Verify sellers, resolve reports and keep every buyer safe — all in one place.</p>' +
      '<div class="auth-points"><div>' + ic('okc') + ' Seller KYC with NIC, BR and on-site selfie</div><div>' + ic('okc') + ' Reports, moderation and bans</div><div>' + ic('okc') + ' Full audit trail of every admin action</div></div></div>' +
      '<div class="auth-foot">Protected area · Two-step verification required · © ' + new Date().getFullYear() + ' AutoGuide</div></aside>' +
      '<main class="auth-form"><form class="auth-card" id="f" novalidate><img class="wm wm-dark" src="/admin/logo.png" alt="AutoGuide"><img class="wm wm-light" src="/admin/logo-light.png" alt="AutoGuide">' +
      '<div class="steps"><span class="on"></span><span class="' + (stepNo >= 2 ? 'on' : '') + '"></span></div>' +
      (msg ? '<div class="alert ' + (/^Signed out/.test(msg) ? 'alert-info' : 'alert-bad') + '">' + ic(/^Signed out/.test(msg) ? 'info' : 'alertc') + '<div>' + esc(msg) + '</div></div>' : '') + body + '</form></main></div>';
    var creds = step.creds || {};
    var first = $('#code') || $('#email');
    if (first) first.focus();
    var rs = $('#restart'); if (rs) rs.addEventListener('click', function () { renderLogin(); });
    var codeIn = $('#code');
    if (codeIn) codeIn.addEventListener('input', function () {
      codeIn.value = codeIn.value.replace(/[^0-9]/g, '').slice(0, 6);
      if (codeIn.value.length === 6) $('#f').requestSubmit ? $('#f').requestSubmit() : null;
    });
    $('#f').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]');
      if (btn.disabled) return;
      if (codeIn && codeIn.value.length !== 6) { codeIn.focus(); return; }
      if (!step.setup && !step.needCode && (!$('#email').value.trim() || !$('#password').value)) { renderLogin('Enter your email and password.'); return; }
      var done = busy(btn, 'Please wait…');
      if (step.setup) {
        api('/admin/auth/2fa/confirm', { method: 'POST', body: { setupToken: step.setupToken, code: codeIn.value.trim() } }).then(signedIn).catch(function (err) { done(); renderLogin(err.message, step); });
        return;
      }
      if (!step.needCode) creds = { email: $('#email').value.trim(), password: $('#password').value };
      var payload = { email: creds.email, password: creds.password };
      if (step.needCode) payload.code = codeIn.value.trim();
      api('/admin/auth/login', { method: 'POST', body: payload }).then(function (r) {
        if (r.needs2faSetup) return api('/admin/auth/2fa/setup', { method: 'POST', body: { setupToken: r.setupToken } }).then(function (setup) { renderLogin('', { setup: setup, setupToken: r.setupToken }); });
        if (r.needs2faCode) return renderLogin('', { needCode: true, creds: creds });
        signedIn(r);
      }).catch(function (err) { done(); renderLogin(err.message, step.needCode ? step : {}); });
    });
  }

  function signedIn(r) {
    state.token = r.accessToken; state.admin = r.admin;
    ssSet(r.accessToken);
    toast('Signed in. Welcome back' + (r.admin && r.admin.fullName ? ', ' + r.admin.fullName.split(' ')[0] : '') + '!');
    go('overview');
  }

  // ---------- layout & routing ----------
  var TITLES = { overview: 'Overview', applications: 'Seller applications', application: 'Seller applications', reports: 'Reports', services: 'Services', users: 'Users', audit: 'Audit log', settings: 'Settings' };
  function navItem(id, icon, label, count) {
    var active = state.view === id || (id === 'applications' && state.view === 'application');
    return '<a href="#/' + id + '" data-go="' + id + '" class="' + (active ? 'active' : '') + '">' + ic(icon) + '<span>' + label + '</span>' + (count ? '<span class="count" data-count="' + id + '">' + esc(count) + '</span>' : '') + '</a>';
  }
  function shell(content) {
    var s = state.stats || { sellers: {}, openReports: 0 };
    var a = state.admin || {};
    var crumbs = '<span>Admin</span>' + ic('chev') + '<b style="color:var(--text);font-weight:600">' + esc(TITLES[state.view] || '') + '</b>';
    if (state.view === 'application') crumbs = '<span>Admin</span>' + ic('chev') + '<a href="#/applications">Seller applications</a>' + ic('chev') + '<b style="color:var(--text);font-weight:600">Review</b>';
    app.innerHTML = '<div class="shell" id="shell"><div class="scrim" id="scrim"></div><aside class="side">' +
      '<div class="side-brand"><img src="/admin/logo-mark.png" alt=""><div><b>AutoGuide</b><small>ADMIN</small></div></div>' +
      '<nav class="nav"><div class="nav-label">WORKSPACE</div>' + navItem('overview', 'grid', 'Overview') + navItem('applications', 'store', 'Seller applications', s.sellers.PENDING) +
      navItem('reports', 'flag', 'Reports', s.openReports) + navItem('services', 'tool', 'Services', s.serviceRequests) + navItem('users', 'users', 'Users') +
      '<div class="nav-label">SYSTEM</div>' + navItem('audit', 'history', 'Audit log') + navItem('settings', 'settings', 'Settings') + '</nav>' +
      '<div class="side-user">' + av(a.fullName || a.email) + '<div class="who"><b>' + esc(a.fullName || 'Administrator') + '</b><span>' + esc(a.email || '') + '</span></div><button class="icon-btn" id="signout" title="Sign out" aria-label="Sign out">' + ic('logout') + '</button></div></aside>' +
      '<div class="main"><header class="topbar"><button class="icon-btn menu-btn" id="menu" aria-label="Menu">' + ic('menu') + '</button><div class="crumbs">' + crumbs + '</div><div class="grow"></div>' +
      '<span class="env ' + (IS_LOCAL ? 'env-local' : 'env-live') + '">' + (IS_LOCAL ? '● LOCAL' : '● LIVE') + '</span>' +
      '<button class="icon-btn theme-btn" id="theme-btn" title="Light / dark mode" aria-label="Switch light or dark mode" style="color:var(--muted)">' + ic(resolvedTheme() === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<button class="icon-btn" id="reload" title="Refresh" aria-label="Refresh" style="color:var(--muted)">' + ic('refresh') + '</button></header>' +
      '<div class="content" id="main">' + content + '</div></div></div>';
    $('#signout').addEventListener('click', function () {
      modal({ icon: 'logout', title: 'Sign out?', text: 'You’ll need your password and authenticator code to sign in again.', confirm: 'Sign out' }).then(function (ok) { if (ok) signOut('Signed out. See you soon.'); });
    });
    $('#menu').addEventListener('click', function () { $('#shell').classList.toggle('open'); });
    $('#scrim').addEventListener('click', function () { $('#shell').classList.remove('open'); });
    $('#reload').addEventListener('click', function () { state.stats = null; route(); });
    $('#theme-btn').addEventListener('click', function () {
      var next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
      toast(next === 'dark' ? 'Dark mode on' : 'Light mode on', 'info');
    });
    window.scrollTo(0, 0);
  }
  function main(html) { var m = $('#main'); if (m) m.innerHTML = html; }
  function pageHead(title, sub, right) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }

  function go(view, arg) {
    var h = '#/' + view + (arg ? '/' + encodeURIComponent(arg) : '');
    if (location.hash === h) route(); else location.hash = h;
  }
  function route() {
    if (!state.token) return;
    var parts = location.hash.replace(/^#[/]?/, '').split('/');
    var view = TITLES[parts[0]] ? parts[0] : 'overview';
    var arg = parts[1] ? decodeURIComponent(parts[1]) : null;
    state.view = view; state.arg = arg;
    var p = state.stats ? Promise.resolve(state.stats) : api('/admin/stats').then(function (s) { state.stats = s; return s; });
    p.then(function () { render(view, arg); refreshStats(); }).catch(function (e) { if (state.token) shell(errBox(e.message)); });
  }
  var lastStats = 0;
  function refreshStats() {
    if (Date.now() - lastStats < 4000) return;
    lastStats = Date.now();
    api('/admin/stats').then(function (s) {
      state.stats = s;
      [['applications', s.sellers.PENDING], ['reports', s.openReports], ['services', s.serviceRequests]].forEach(function (x) {
        var a = app.querySelector('.nav a[data-go="' + x[0] + '"]'); if (!a) return;
        var c = a.querySelector('.count');
        if (!x[1]) { if (c) c.remove(); return; }
        if (!c) { c = document.createElement('span'); c.className = 'count'; a.appendChild(c); }
        c.textContent = x[1];
      });
    }).catch(function () {});
  }
  window.addEventListener('hashchange', route);

  function render(view, arg) {
    if (view === 'overview') return overview();
    if (view === 'applications') return applications(arg || 'PENDING');
    if (view === 'application') return application(arg);
    if (view === 'reports') return reportsView(arg || 'OPEN');
    if (view === 'services') return servicesView(arg || 'requests');
    if (view === 'users') return usersView(arg || '');
    if (view === 'audit') return auditView();
    if (view === 'settings') return settingsView();
  }

  // ---------- overview ----------
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function overview() {
    var s = state.stats, a = state.admin || {};
    function stat(icon, tone, v, l, link) {
      return '<div class="card stat' + (link ? ' link' : '') + '"' + (link ? ' data-go="' + link + '"' : '') + '><div class="tile ' + tone + '">' + ic(icon) + '</div><div><div class="v">' + esc(Number(v || 0).toLocaleString()) + '</div><div class="l">' + esc(l) + '</div></div></div>';
    }
    var pending = s.sellers.PENDING || 0, open = s.openReports || 0, sreq = s.serviceRequests || 0;
    var attention = pending + open + sreq;
    var hero = '<div class="hero"><div class="tile" style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.12);color:#fff">' + ic(attention ? 'alert' : 'shield') + '</div><div class="grow">' +
      (attention ? '<h2>' + (pending ? pending + (pending === 1 ? ' seller is' : ' sellers are') + ' waiting for review' : 'No sellers waiting') + (open ? ' · ' + open + ' open report' + (open === 1 ? '' : 's') : '') + (sreq ? ' · ' + sreq + ' service request' + (sreq === 1 ? '' : 's') : '') + '</h2><p>Sellers can’t list parts until you approve them — the oldest applications are shown first.</p>'
        : '<h2>All caught up</h2><p>No applications or reports need your attention right now. Nice work.</p>') + '</div>' +
      (pending ? '<button class="btn btn-primary" data-go="applications">' + ic('store') + ' Review applications</button>' : '') + (open ? '<button class="btn btn-ghost" data-go="reports">' + ic('flag') + ' Open reports</button>' : '') + (sreq ? '<button class="btn btn-ghost" data-go="services">' + ic('tool') + ' Service requests</button>' : '') + '</div>';
    var total = (s.sellers.PENDING || 0) + (s.sellers.APPROVED || 0) + (s.sellers.REJECTED || 0) + (s.sellers.SUSPENDED || 0);
    var seg = [['APPROVED', 'Live', '#0F7B58'], ['PENDING', 'Pending', '#E08A1E'], ['REJECTED', 'Rejected', '#C21D2E'], ['SUSPENDED', 'Suspended', '#9C9EB3']];
    var pipeline = '<div class="card card-pad"><div class="card-head" style="padding:0;border:0;margin-bottom:6px"><h3>' + ic('store') + ' Seller pipeline</h3><span class="tag">' + total + ' total</span></div>' +
      '<div class="bar">' + seg.map(function (x) { var n = s.sellers[x[0]] || 0; return n ? '<span style="width:' + (n / total * 100) + '%;background:' + x[2] + '" title="' + x[1] + ': ' + n + '"></span>' : ''; }).join('') + '</div>' +
      '<div class="legend">' + seg.map(function (x) { return '<div><i style="background:' + x[2] + '"></i>' + x[1] + '<b>' + (s.sellers[x[0]] || 0) + '</b></div>'; }).join('') + '</div>' +
      '<div style="border-top:1px solid var(--line-2);margin-top:16px;padding-top:14px" class="legend"><div>' + ic('users') + ' Admins<b>' + (s.users.admins || 0) + '</b></div></div></div>';
    shell(pageHead(greeting() + (a.fullName ? ', ' + a.fullName.split(' ')[0] : ''), new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · Here’s what’s happening on the marketplace.') + hero +
      '<div class="stats">' + stat('store', 't-warn', pending, 'Applications to review', 'applications') + stat('flag', 't-red', open, 'Open reports', 'reports') + stat('tool', 't-info', sreq, 'Service requests', 'services') + stat('okc', 't-ok', s.sellers.APPROVED, 'Live stores', 'applications/APPROVED') +
      stat('pkg', 't-navy', s.products, 'Active listings') + stat('tool', 't-navy', s.services, 'Live services', 'services/types') + stat('users', 't-info', s.users.buyers, 'Buyers', 'users') + stat('cart', 't-ok', s.orders, 'Orders placed') + '</div>' +
      '<div class="grid3"><div class="stack"><div class="card"><div class="card-head"><h3>' + ic('clock') + ' Waiting for review</h3><button class="btn btn-link btn-sm" data-go="applications">View all ' + ic('chev') + '</button></div><div id="ov-apps">' + skInline(3) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + ic('flag') + ' Latest open reports</h3><button class="btn btn-link btn-sm" data-go="reports">View all ' + ic('chev') + '</button></div><div id="ov-reports">' + skInline(2) + '</div></div></div>' + pipeline + '</div>');
    bindGo();
    api('/admin/sellers?status=PENDING').then(function (rows) {
      var el = $('#ov-apps'); if (!el) return;
      el.innerHTML = rows.length ? rows.slice(0, 5).map(function (r) {
        return '<div class="list-item" data-app="' + esc(r.id) + '">' + av(r.storeName) + '<div class="grow"><b>' + esc(r.storeName) + '</b><small>' + esc(r.ownerName) + ' · ' + esc(joinAddr([r.city, r.district])) + '</small></div><small>' + esc(ago(r.submittedAt)) + '</small>' + ic('chev', 'chev') + '</div>';
      }).join('') : empty('okc', 'No pending applications', 'New seller applications will appear here.');
      el.querySelectorAll('[data-app]').forEach(function (n) { n.addEventListener('click', function () { go('application', n.getAttribute('data-app')); }); });
    }).catch(function (e) { var el = $('#ov-apps'); if (el) el.innerHTML = '<div style="padding:16px">' + errBox(e.message) + '</div>'; });
    api('/admin/reports?status=OPEN').then(function (rows) {
      var el = $('#ov-reports'); if (!el) return;
      el.innerHTML = rows.length ? rows.slice(0, 4).map(function (r) {
        var p = r.preview || { title: '(deleted)' };
        return '<div class="list-item" data-go="reports"><div class="tile t-red" style="width:36px;height:36px;border-radius:10px">' + ic(TARGET_ICON[r.targetType] || 'flag') + '</div><div class="grow"><b>' + esc(REASONS[r.reason] || r.reason) + '</b><small>' + esc(cap(r.targetType)) + ' · ' + esc(p.title) + '</small></div><small>' + esc(ago(r.createdAt)) + '</small>' + ic('chev', 'chev') + '</div>';
      }).join('') : empty('shield', 'No open reports', 'Reports from buyers and sellers will appear here.');
      bindGo(el);
    }).catch(function (e) { var el = $('#ov-reports'); if (el) el.innerHTML = '<div style="padding:16px">' + errBox(e.message) + '</div>'; });
  }
  function skInline(n) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<div class="sk-row"><div class="sk" style="width:36px;height:36px;border-radius:50%"></div><div style="flex:1"><div class="sk" style="height:12px;width:45%;margin-bottom:8px"></div><div class="sk" style="height:10px;width:30%"></div></div></div>';
    return out;
  }
  function bindGo(root) {
    (root || app).querySelectorAll('[data-go]').forEach(function (el) {
      if (el.closest('.nav')) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var t = el.getAttribute('data-go').split('/');
        go(t[0], t[1]);
      });
    });
  }

  // ---------- services: types + sellers' requests ----------
  var ICON_LABELS = {
    'build-outline': 'Spanner', 'water-outline': 'Oil drop', 'flash-outline': 'Lightning', 'snow-outline': 'Snowflake', 'cog-outline': 'Cog',
    'color-wand-outline': 'Magic wand', 'car-outline': 'Car', 'car-sport-outline': 'Sports car', 'construct-outline': 'Tools', 'hammer-outline': 'Hammer',
    'speedometer-outline': 'Speedometer', 'battery-charging-outline': 'Battery', 'color-palette-outline': 'Paint palette', 'sparkles-outline': 'Sparkles',
    'disc-outline': 'Tyre / disc', 'shield-checkmark-outline': 'Shield', 'navigate-outline': 'GPS', 'medkit-outline': 'First aid'
  };
  var TYPE_ICON = {
    'build-outline': 'tool', 'water-outline': 'drop', 'flash-outline': 'zap', 'snow-outline': 'snow', 'cog-outline': 'settings', 'color-wand-outline': 'wand',
    'car-outline': 'car', 'car-sport-outline': 'car', 'construct-outline': 'tool', 'hammer-outline': 'tool', 'speedometer-outline': 'gauge',
    'battery-charging-outline': 'zap', 'color-palette-outline': 'wand', 'sparkles-outline': 'wand', 'disc-outline': 'disc', 'shield-checkmark-outline': 'shield',
    'navigate-outline': 'pin', 'medkit-outline': 'plus'
  };
  function typeIcon(name) { return ic(TYPE_ICON[name] || 'tool'); }
  var svcIcons = null;

  // A small form in a modal: fields = [{ name, label, type: text|textarea|select, value, options: [[value,label]], required, hint }].
  function formModal(o) {
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      var toneCls = { bad: 't-red', ok: 't-ok', warn: 't-warn', navy: 't-navy' }[o.tone || 'navy'];
      var fields = o.fields.map(function (f) {
        var input;
        if (f.type === 'select') {
          input = '<select class="input" name="' + f.name + '">' + f.options.map(function (op) { return '<option value="' + esc(op[0]) + '"' + (op[0] === f.value ? ' selected' : '') + '>' + esc(op[1]) + '</option>'; }).join('') + '</select>';
        } else if (f.type === 'textarea') {
          input = '<textarea class="input" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(f.value || '') + '</textarea>';
        } else {
          input = '<input class="input" name="' + f.name + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.placeholder || '') + '" maxlength="' + (f.max || 100) + '">';
        }
        return '<div class="field"><label>' + esc(f.label) + '</label>' + (f.chips ? '<div class="chips" style="margin-bottom:8px">' + f.chips.map(function (c) { return '<button type="button" class="chip" data-for="' + f.name + '" data-chip="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '') + input + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
      }).join('');
      root.innerHTML = '<div class="modal-backdrop"><form class="modal" role="dialog" aria-modal="true" novalidate><div class="modal-b"><div class="modal-ic tile ' + toneCls + '">' + ic(o.icon || 'info') + '</div><h3>' + esc(o.title) + '</h3>' +
        (o.text ? '<p class="lead">' + esc(o.text) + '</p>' : '') + fields + '<div id="m-err"></div></div><div class="modal-f"><button type="button" class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn ' + (o.confirmClass || 'btn-navy') + '">' + esc(o.confirm || 'Save') + '</button></div></form></div>';
      var form = root.querySelector('form'), back = root.querySelector('.modal-backdrop');
      function close(v) { document.removeEventListener('keydown', key); root.innerHTML = ''; resolve(v); }
      function key(e) { if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', key);
      back.addEventListener('mousedown', function (e) { if (e.target === back) close(null); });
      root.querySelector('#m-cancel').addEventListener('click', function () { close(null); });
      root.querySelectorAll('[data-chip]').forEach(function (b) { b.addEventListener('click', function () { form.elements[b.getAttribute('data-for')].value = b.getAttribute('data-chip'); }); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var out = {};
        for (var i = 0; i < o.fields.length; i++) {
          var f = o.fields[i], v = form.elements[f.name].value.trim();
          if (f.required && !v) { root.querySelector('#m-err').innerHTML = errBox(f.label + ' is required.'); form.elements[f.name].focus(); return; }
          out[f.name] = v;
        }
        close(out);
      });
      setTimeout(function () { var first = form.querySelector('input,textarea,select'); if (first) first.focus(); }, 30);
    });
  }

  function iconOptions() {
    return (svcIcons || Object.keys(ICON_LABELS)).map(function (n) { return [n, ICON_LABELS[n] || n]; });
  }
  function loadIcons() {
    if (svcIcons) return Promise.resolve(svcIcons);
    return api('/admin/service-types').then(function (r) { svcIcons = r.icons; return svcIcons; });
  }

  function servicesView(tab) {
    var s = state.stats || {};
    var tabs = [['requests', 'Requests', s.serviceRequests || 0], ['approved', 'Approved', null], ['declined', 'Declined', null], ['types', 'Service types', null]];
    shell(pageHead('Services', 'The service list sellers choose from, and their requests to add new ones.', tab === 'types' ? '<button class="btn btn-primary" id="add-type">' + ic('plus') + ' Add service type</button>' : '') +
      '<div class="toolbar"><div class="seg">' + tabs.map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + (t[2] != null ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div></div><div id="list">' + skRows(4) + '</div>');
    on('[data-tab]', 'click', function (e) { go('services', e.currentTarget.getAttribute('data-tab')); });
    if (tab === 'types') return typesTab();
    requestsTab(tab === 'approved' ? 'APPROVED' : tab === 'declined' ? 'DECLINED' : 'PENDING');
  }

  function requestsTab(status) {
    Promise.all([api('/admin/service-requests?status=' + status), api('/admin/service-types')]).then(function (res) {
      var rows = res[0], types = res[1].types;
      svcIcons = res[1].icons;
      var el = $('#list'); if (!el) return;
      if (!rows.length) {
        el.innerHTML = '<div class="card">' + (status === 'PENDING' ? empty('okc', 'No requests waiting', 'When a seller asks for a service that isn’t listed, it shows up here.') : empty('inbox', 'Nothing here yet', '')) + '</div>';
        return;
      }
      el.innerHTML = rows.map(function (r) {
        var st = r.store || {}, by = r.requestedBy || {};
        return '<div class="card report" data-id="' + esc(r.id) + '"><div class="report-top"><div class="tile t-info" style="width:34px;height:34px;border-radius:10px">' + ic('tool') + '</div><span class="tag">new service type</span>' +
          (status === 'PENDING' ? badge('PENDING', 'Waiting') : status === 'APPROVED' ? badge('APPROVED', 'Added') : badge('REJECTED', 'Declined')) +
          '<span class="when" title="' + esc(when(r.createdAt)) + '">' + esc(ago(r.createdAt)) + '</span></div>' +
          '<h4>“' + esc(r.name) + '”' + (r.serviceType && r.serviceType.name !== r.name ? ' <span style="color:var(--muted);font-weight:500">→ added as ' + esc(r.serviceType.name) + '</span>' : '') + '</h4>' +
          (r.note ? '<div class="quote">' + esc(r.note) + '</div>' : '') +
          (r.reviewNote ? '<div class="alert alert-warn" style="margin:10px 0 0">' + ic('msg') + '<div><b>Reason sent:</b> ' + esc(r.reviewNote) + '</div></div>' : '') +
          '<div class="people"><span>' + ic('store') + 'Requested by <b style="color:var(--text)">' + esc(st.name) + '</b> · ' + esc(joinAddr([st.city, st.district])) + '</span><span>' + ic('user') + esc(by.fullName) + ' · ' + esc(by.email) + '</span></div>' +
          (status === 'PENDING' ? '<div class="report-actions"><div class="grow"></div><button class="btn btn-ghost btn-sm" data-decline>' + ic('x') + ' Decline</button><button class="btn btn-ghost btn-sm" data-map>' + ic('chev') + ' Use existing type</button><button class="btn btn-ok btn-sm" data-approve>' + ic('check') + ' Add to list</button></div>' : '') + '</div>';
      }).join('');
      var byId = {}; rows.forEach(function (r) { byId[r.id] = r; });
      on('[data-approve]', 'click', function (e) {
        var r = byId[e.currentTarget.closest('[data-id]').getAttribute('data-id')];
        formModal({ icon: 'plus', tone: 'ok', title: 'Add “' + r.name + '” to the list?', text: 'It appears in the app straight away and ' + (r.store ? r.store.name : 'the seller') + ' gets an email.', confirm: 'Add service type', confirmClass: 'btn-ok', fields: [
          { name: 'name', label: 'Name shown in the app', value: r.name, required: true, hint: 'Tidy up spelling or capitals if needed.' },
          { name: 'icon', label: 'Icon', type: 'select', value: 'construct-outline', options: iconOptions() },
          { name: 'description', label: 'Short description (optional)', placeholder: 'e.g. Wheel alignment and balancing', max: 255 }
        ] }).then(function (v) {
          if (!v) return;
          api('/admin/service-requests/' + r.id + '/approve', { method: 'POST', body: { name: v.name, icon: v.icon, description: v.description || undefined } })
            .then(function (res) { toast('“' + res.serviceType.name + '” added. The seller has been told.'); state.stats = null; route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
      on('[data-map]', 'click', function (e) {
        var r = byId[e.currentTarget.closest('[data-id]').getAttribute('data-id')];
        formModal({ icon: 'tool', title: 'Use an existing type', text: 'If “' + r.name + '” is really the same as a service already in the list, link it instead of adding a duplicate. The seller is told which one to choose.', confirm: 'Link request', fields: [
          { name: 'existingTypeId', label: 'Existing service type', type: 'select', value: '', options: types.map(function (t) { return [t.id, t.name + (t.isActive ? '' : ' (hidden — will be shown)')]; }) }
        ] }).then(function (v) {
          if (!v) return;
          api('/admin/service-requests/' + r.id + '/approve', { method: 'POST', body: { existingTypeId: v.existingTypeId } })
            .then(function (res) { toast('Linked to “' + res.serviceType.name + '”.'); state.stats = null; route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
      on('[data-decline]', 'click', function (e) {
        var r = byId[e.currentTarget.closest('[data-id]').getAttribute('data-id')];
        modal({ icon: 'x', tone: 'bad', title: 'Decline “' + r.name + '”?', text: 'The seller gets an email with your reason.', confirm: 'Decline request', confirmClass: 'btn-primary',
          input: { label: 'Reason (the seller sees this)', placeholder: 'Explain why…', chips: ['This is already covered by Garages', 'This is already covered by Service Station', 'We don’t list this kind of service yet'] } }).then(function (note) {
          if (!note) return;
          api('/admin/service-requests/' + r.id + '/decline', { method: 'POST', body: { note: note } })
            .then(function () { toast('Request declined. The seller has been told why.'); state.stats = null; route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
    }).catch(function (e) { var el = $('#list'); if (el) el.innerHTML = errBox(e.message); });
  }

  function typesTab() {
    var add = $('#add-type');
    if (add) add.addEventListener('click', function () {
      loadIcons().then(function () {
        formModal({ icon: 'plus', tone: 'ok', title: 'Add a service type', text: 'Sellers can choose it straight away when adding a service.', confirm: 'Add service type', confirmClass: 'btn-ok', fields: [
          { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Tyre Fitting' },
          { name: 'icon', label: 'Icon', type: 'select', value: 'construct-outline', options: iconOptions() },
          { name: 'description', label: 'Short description (optional)', placeholder: 'What sellers in this type do', max: 255 }
        ] }).then(function (v) {
          if (!v) return;
          api('/admin/service-types', { method: 'POST', body: { name: v.name, icon: v.icon, description: v.description || undefined } })
            .then(function (t) { toast('“' + t.name + '” added.'); route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
    });
    api('/admin/service-types').then(function (res) {
      svcIcons = res.icons;
      var rows = res.types, el = $('#list'); if (!el) return;
      if (!rows.length) { el.innerHTML = '<div class="card">' + empty('tool', 'No service types', 'Add the first one.') + '</div>'; return; }
      el.innerHTML = '<div class="card table-wrap"><table class="table"><thead><tr><th style="width:56px">Order</th><th>Service type</th><th class="hide-sm">Icon</th><th>Live services</th><th>Status</th><th></th></tr></thead><tbody>' +
        rows.map(function (t, i) {
          return '<tr data-id="' + esc(t.id) + '"><td><div style="display:flex;flex-direction:column;gap:2px">' +
            '<button class="icon-btn" style="width:26px;height:22px;color:var(--muted)" data-move="-1" ' + (i === 0 ? 'disabled' : '') + ' title="Move up"><svg class="i" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>' +
            '<button class="icon-btn" style="width:26px;height:22px;color:var(--muted)" data-move="1" ' + (i === rows.length - 1 ? 'disabled' : '') + ' title="Move down"><svg class="i" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button></div></td>' +
            '<td><div class="person"><div class="tile ' + (t.isActive ? 't-navy' : 't-grey') + '" style="width:36px;height:36px;border-radius:10px">' + typeIcon(t.icon) + '</div><div style="min-width:0"><b>' + esc(t.name) + '</b><div class="sub">' + esc(t.description || '—') + '</div></div></div></td>' +
            '<td class="hide-sm"><span class="sub">' + esc(ICON_LABELS[t.icon] || t.icon || '—') + '</span></td>' +
            '<td>' + esc(t.serviceCount) + '</td><td>' + (t.isActive ? badge('ACTIVE', 'Shown') : badge('SUSPENDED', 'Hidden')) + '</td>' +
            '<td class="r"><button class="btn btn-ghost btn-sm" data-edit>' + ic('settings') + ' Edit</button> ' +
            (t.isActive ? '<button class="btn btn-danger btn-sm" data-hide>' + ic('eye') + ' Hide</button>' : '<button class="btn btn-ghost btn-sm" data-show>' + ic('refresh') + ' Show</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="hint" style="margin-top:12px">Hiding a type removes it from the app and hides its services until you show it again. Nothing is deleted.</p>';
      var byId = {}; rows.forEach(function (t) { byId[t.id] = t; });
      function rowOf(e) { return byId[e.currentTarget.closest('[data-id]').getAttribute('data-id')]; }
      on('[data-edit]', 'click', function (e) {
        var t = rowOf(e);
        formModal({ icon: 'settings', title: 'Edit “' + t.name + '”', confirm: 'Save changes', fields: [
          { name: 'name', label: 'Name', value: t.name, required: true },
          { name: 'icon', label: 'Icon', type: 'select', value: t.icon, options: iconOptions() },
          { name: 'description', label: 'Short description', value: t.description || '', max: 255 }
        ] }).then(function (v) {
          if (!v) return;
          api('/admin/service-types/' + t.id, { method: 'PATCH', body: { name: v.name, icon: v.icon, description: v.description || null } })
            .then(function () { toast('Saved.'); route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
      on('[data-hide]', 'click', function (e) {
        var t = rowOf(e);
        modal({ icon: 'eye', tone: 'warn', title: 'Hide “' + t.name + '”?', text: t.serviceCount ? 'Its ' + t.serviceCount + ' live service' + (t.serviceCount === 1 ? '' : 's') + ' will be hidden from buyers until you show it again.' : 'Sellers won’t be able to choose it.', confirm: 'Hide', confirmClass: 'btn-primary' }).then(function (ok) {
          if (!ok) return;
          api('/admin/service-types/' + t.id, { method: 'PATCH', body: { isActive: false } }).then(function () { toast('“' + t.name + '” hidden.'); route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
      on('[data-show]', 'click', function (e) {
        var t = rowOf(e);
        api('/admin/service-types/' + t.id, { method: 'PATCH', body: { isActive: true } }).then(function () { toast('“' + t.name + '” is shown again.'); route(); }).catch(function (err) { toast(err.message, 'bad'); });
      });
      on('[data-move]', 'click', function (e) {
        var t = rowOf(e), dir = Number(e.currentTarget.getAttribute('data-move'));
        var i = rows.indexOf(t), j = i + dir; if (j < 0 || j >= rows.length) return;
        var order = rows.slice(); order.splice(i, 1); order.splice(j, 0, t);
        Promise.all(order.map(function (x, k) { return x.sortOrder === k ? null : api('/admin/service-types/' + x.id, { method: 'PATCH', body: { sortOrder: k } }); }))
          .then(function () { route(); }).catch(function (err) { toast(err.message, 'bad'); });
      });
    }).catch(function (e) { var el = $('#list'); if (el) el.innerHTML = errBox(e.message); });
  }

  // ---------- seller applications ----------
  var appRows = [];
  function applications(status) {
    var counts = state.stats.sellers;
    shell(pageHead('Seller applications', 'Check each seller’s NIC, BR certificate, shop location and selfie before approving.') +
      '<div class="toolbar"><div class="seg">' + [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['SUSPENDED', 'Suspended']].map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (t[0] === status ? 'on' : '') + '">' + t[1] + '<span class="n">' + (counts[t[0]] || 0) + '</span></button>';
      }).join('') + '</div><div class="grow"></div><div class="search">' + ic('search') + '<input class="input" id="q" placeholder="Search store, owner, BR or city…"></div></div><div id="list">' + skRows(5) + '</div>');
    on('[data-tab]', 'click', function (e) { go('applications', e.currentTarget.getAttribute('data-tab')); });
    api('/admin/sellers?status=' + status).then(function (rows) {
      appRows = rows;
      drawApps(status, '');
      $('#q').addEventListener('input', function (e) { drawApps(status, e.target.value.trim().toLowerCase()); });
    }).catch(function (e) { main(errBox(e.message)); });
  }
  function drawApps(status, q) {
    var rows = appRows.filter(function (r) { return !q || [r.storeName, r.businessName, r.brNumber, r.ownerName, r.ownerEmail, r.city, r.district].join(' ').toLowerCase().indexOf(q) >= 0; });
    var el = $('#list'); if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="card">' + (q ? empty('search', 'No matches', 'Try a different search.') : status === 'PENDING' ? empty('okc', 'You’re all caught up', 'There are no applications waiting for review.') : empty('inbox', 'Nothing here yet', 'No ' + status.toLowerCase() + ' sellers.')) + '</div>';
      return;
    }
    el.innerHTML = '<div class="card table-wrap"><table class="table"><thead><tr><th>Store</th><th class="hide-sm">BR number</th><th>Owner</th><th class="hide-sm">Location</th><th>' + (status === 'PENDING' ? 'Submitted' : 'Updated') + '</th><th>Status</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var t = status === 'PENDING' ? r.submittedAt : (r.reviewedAt || r.submittedAt);
        return '<tr class="click" data-id="' + esc(r.id) + '"><td><div class="person">' + av(r.storeName) + '<div style="min-width:0"><b>' + esc(r.storeName) + '</b><div class="sub">' + esc(r.businessName || '—') + '</div></div></div></td>' +
          '<td class="hide-sm"><span class="mono">' + esc(r.brNumber || '—') + '</span></td><td>' + esc(r.ownerName) + '<div class="sub">' + esc(r.ownerEmail) + '</div></td>' +
          '<td class="hide-sm">' + esc(joinAddr([r.city, r.district]) || '—') + '</td><td>' + esc(ago(t)) + '<div class="sub">' + esc(day(t)) + '</div></td><td>' + badge(r.status) + '</td><td class="r">' + ic('chev', 'chev') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    el.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { go('application', tr.getAttribute('data-id')); }); });
  }

  // ---------- application detail ----------
  function docTile(key, label, icon, d) {
    if (!d) return '<div class="doc missing"><div class="ph">' + ic(icon) + '</div><div class="cap">' + esc(label) + '<span>Not uploaded</span></div></div>';
    var url = '/api' + d.url, pdf = d.mimeType === 'application/pdf';
    return '<div class="doc" data-doc="' + key + '" data-url="' + esc(url) + '" data-pdf="' + (pdf ? 1 : 0) + '" data-label="' + esc(label) + '" role="button" tabindex="0"><div class="ph">' + (pdf ? ic('file') : '<img src="' + esc(url) + '" alt="' + esc(label) + '" loading="lazy">') + '</div>' +
      '<div class="cap">' + esc(label) + '<span>' + (pdf ? 'PDF' : 'Photo') + ' ' + ic('eye') + '</span></div></div>';
  }
  function distance(sf) {
    if (!sf) return '';
    var m = sf.distanceFromShopM;
    if (m == null) return '<div class="note alert-warn">' + ic('alert') + '<div><b>No location on the selfie.</b> The phone didn’t share its location when the photo was taken — compare the background with the shop address.</div></div>';
    var cls = m <= 300 ? 'alert-ok' : m <= 2000 ? 'alert-warn' : 'alert-bad';
    var txt = m < 1000 ? m + ' m' : (m / 1000).toFixed(1) + ' km';
    var verdict = m <= 300 ? 'Taken at the pinned shop.' : m <= 2000 ? 'Taken near the pinned shop — check it.' : 'Taken far from the pinned shop — be careful.';
    return '<div class="note ' + cls + '">' + ic(m <= 300 ? 'okc' : 'pin') + '<div><b>Selfie taken ' + txt + ' from the shop pin.</b> ' + verdict + ' <span style="opacity:.8">· ' + esc(when(sf.takenAt)) + '</span></div></div>';
  }
  function kv(rows) { return '<div class="kv">' + rows.map(function (r) { return '<div class="k">' + esc(r[0]) + '</div><div class="v' + (r[2] ? ' mono' : '') + '">' + (r[1] == null || r[1] === '' ? '<span style="color:var(--faint)">—</span>' : esc(r[1])) + '</div>'; }).join('') + '</div>'; }
  var CHECKS = ['NIC photos are clear and the name matches the owner', 'BR certificate shows the same business name and number', 'Shop address matches the map pin', 'Selfie was taken at the shop and shows the owner', 'Phone number and details look genuine'];

  function application(id) {
    shell('<div class="sk" style="height:14px;width:140px;margin-bottom:18px"></div><div class="card" style="padding:22px;margin-bottom:18px;display:flex;gap:16px;align-items:center"><div class="sk" style="width:56px;height:56px;border-radius:16px"></div><div style="flex:1"><div class="sk" style="height:18px;width:40%;margin-bottom:10px"></div><div class="sk" style="height:12px;width:60%"></div></div></div><div class="detail"><div class="sk" style="height:320px;border-radius:18px"></div><div class="sk" style="height:320px;border-radius:18px"></div></div>');
    api('/admin/sellers/' + id).then(function (d) {
      var o = d.owner || {};
      var head = '<button class="back" id="back">' + ic('back') + ' All applications</button>' +
        '<div class="card detail-head">' + av(d.storeName, 'lg') + '<div style="flex:1;min-width:220px"><h1>' + esc(d.storeName) + ' ' + badge(d.status) + '</h1><div class="meta">' +
        '<span>' + ic('brief') + esc(d.businessName || '—') + '</span><span>' + ic('pin') + esc(joinAddr([d.city, d.district]) || '—') + '</span>' +
        '<span>' + ic('cal') + (d.status === 'PENDING' ? 'Submitted ' + esc(ago(d.submittedAt)) : esc(d.reviewedBy ? 'Reviewed by ' + d.reviewedBy : 'Reviewed') + ' · ' + esc(ago(d.reviewedAt))) + '</span>' +
        '<span>' + ic('pkg') + esc(d.productCount || 0) + ' live listings</span></div></div></div>' +
        (d.reviewNote ? '<div class="alert alert-warn" style="margin-bottom:18px">' + ic('msg') + '<div><b>Note sent to the seller:</b> ' + esc(d.reviewNote) + '</div></div>' : '');
      var docs = '<div class="card"><div class="card-head"><h3>' + ic('idcard') + ' Identity documents</h3><span class="hint" style="margin:0">Links expire in 10 min</span></div><div class="card-pad">' +
        '<div class="docs">' + docTile('nf', 'NIC front', 'idcard', d.nicFront) + docTile('nb', 'NIC back', 'idcard', d.nicBack) + docTile('br', 'BR certificate', 'file', d.document) + docTile('sf', 'Shop selfie', 'camera', d.selfie) + '</div>' + distance(d.selfie) + '</div></div>';
      var owner = '<div class="card"><div class="card-head"><h3>' + ic('user') + ' Owner</h3></div><div class="card-pad" style="padding-top:6px;padding-bottom:6px">' +
        kv([['Full name', o.fullName], ['NIC number', d.nicNumber, 1], ['Email', o.email], ['Mobile', o.phone], ['Home address', joinAddr([o.addressLine1, o.addressLine2, o.city, o.district])], ['Member since', day(o.createdAt)]]) + '</div></div>';
      var biz = '<div class="card"><div class="card-head"><h3>' + ic('brief') + ' Business</h3></div><div class="card-pad" style="padding-top:6px;padding-bottom:6px">' +
        kv([['Registered name', d.businessName], ['BR number', d.brNumber, 1], ['Shop address', joinAddr([d.addressLine1, d.addressLine2, d.city, d.district])], ['Business phone', d.contactPhone], ['Store name', d.storeName], ['About', d.bio]]) + '</div></div>';
      var map = '<div class="card"><div class="card-head"><h3>' + ic('pin') + ' Shop location</h3>' + (d.latitude != null ? '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + d.latitude + ',' + d.longitude + '">' + ic('ext') + ' Google Maps</a>' : '') + '</div><div class="card-pad">' +
        (d.latitude != null ? '<div id="map" class="map"></div><div class="legend" style="grid-auto-flow:column;justify-content:start;gap:18px;margin-top:12px"><div><i style="background:#E5120B;border-radius:50%"></i>Shop pin</div>' + (d.selfie && d.selfie.latitude != null ? '<div><i style="background:#231F20;border-radius:50%"></i>Where the selfie was taken</div>' : '') + '</div>'
          : empty('pin', 'No map location', 'The seller didn’t pin their shop.')) + '</div></div>';

      var canApprove = d.status !== 'APPROVED';
      var rejectLabel = d.status === 'APPROVED' ? 'Suspend store' : (d.status === 'PENDING' || d.status === 'SUSPENDED') ? 'Reject with reason' : '';
      var decision = '<div class="card sticky"><div class="card-head"><h3>' + ic('shield') + ' Decision</h3>' + badge(d.status) + '</div><div class="card-pad">' +
        (canApprove ? '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted)"><span>Verification checklist</span><b id="ck-n" style="color:var(--text)">0 / ' + CHECKS.length + '</b></div><div class="progress"><span id="ck-bar" style="width:0"></span></div>' +
          '<div class="check">' + CHECKS.map(function (c, i) { return '<label><input type="checkbox" data-ck="' + i + '"><span>' + esc(c) + '</span></label>'; }).join('') + '</div><div style="height:16px"></div>' : '<p class="hint" style="margin-top:0">This store is live. Suspend it if it breaks the rules — its listings are hidden immediately and the seller sees your reason.</p>') +
        '<div style="display:grid;gap:8px">' + (canApprove ? '<button class="btn btn-ok btn-block" id="approve">' + ic('check') + (d.status === 'PENDING' ? ' Approve seller' : ' Approve / reinstate') + '</button>' : '') +
        (rejectLabel ? '<button class="btn btn-danger btn-block" id="reject">' + ic(d.status === 'APPROVED' ? 'pause' : 'x') + ' ' + rejectLabel + '</button>' : '') + '</div></div>' +
        '<div style="border-top:1px solid var(--line-2);padding:14px 20px" class="legend"><div>' + ic('cal') + ' Submitted<b>' + esc(day(d.submittedAt)) + '</b></div>' + (d.reviewedAt ? '<div>' + ic('clock') + ' Last decision<b>' + esc(day(d.reviewedAt)) + '</b></div>' : '') + '</div></div>';

      shell(head + '<div class="detail"><div class="stack">' + docs + '<div class="grid2">' + owner + biz + '</div>' + map + '</div><div>' + decision + '</div></div>');
      $('#back').addEventListener('click', function () { go('applications', d.status); });
      on('[data-doc]', 'click', function (e) { var t = e.currentTarget; lightbox(t.getAttribute('data-url'), t.getAttribute('data-label'), t.getAttribute('data-pdf') === '1'); });
      on('[data-doc]', 'keydown', function (e) { if (e.key === 'Enter') e.currentTarget.click(); });
      var ticks = 0;
      on('[data-ck]', 'change', function () {
        ticks = app.querySelectorAll('[data-ck]:checked').length;
        $('#ck-n').textContent = ticks + ' / ' + CHECKS.length;
        $('#ck-bar').style.width = (ticks / CHECKS.length * 100) + '%';
      });
      if (d.latitude != null) drawMap(d);
      var ap = $('#approve');
      if (ap) ap.addEventListener('click', function () {
        var all = ticks === CHECKS.length;
        modal({ icon: all ? 'okc' : 'alert', tone: all ? 'ok' : 'warn', title: 'Approve ' + d.storeName + '?',
          text: (all ? '' : 'You haven’t ticked every check. ') + 'The store goes live straight away and the seller can start listing parts. They’ll get an email.', confirm: 'Approve seller', confirmClass: 'btn-ok' }).then(function (ok) {
          if (!ok) return;
          var done = busy(ap);
          api('/admin/sellers/' + id + '/approve', { method: 'POST', body: {} }).then(function () { toast(d.storeName + ' is approved and live.'); state.stats = null; route(); }).catch(function (e) { done(); toast(e.message, 'bad'); });
        });
      });
      var rj = $('#reject');
      if (rj) rj.addEventListener('click', function () {
        var suspend = d.status === 'APPROVED';
        modal({ icon: suspend ? 'pause' : 'x', tone: 'bad', title: suspend ? 'Suspend ' + d.storeName + '?' : 'Reject this application?',
          text: suspend ? 'The store and all its listings are hidden right away.' : 'The seller can fix the problem and send the application again.',
          input: { label: 'Reason (the seller sees this)', placeholder: 'Explain what needs fixing…', chips: suspend ? ['Selling fake or counterfeit parts', 'Repeated buyer complaints', 'Asking buyers to pay outside the app'] : ['The BR number doesn’t match the certificate', 'NIC photos are unclear — please upload them again', 'The selfie wasn’t taken at the shop', 'The shop address doesn’t match the map pin'] },
          confirm: suspend ? 'Suspend store' : 'Reject application', confirmClass: 'btn-primary' }).then(function (note) {
          if (!note) return;
          api('/admin/sellers/' + id + '/reject', { method: 'POST', body: { note: note } }).then(function () { toast(suspend ? 'Store suspended.' : 'Application rejected. The seller has been told why.'); state.stats = null; route(); }).catch(function (e) { toast(e.message, 'bad'); });
        });
      });
    }).catch(function (e) { shell('<button class="back" id="back">' + ic('back') + ' All applications</button>' + errBox(e.message)); $('#back').addEventListener('click', function () { go('applications'); }); });
  }
  function drawMap(d) {
    var tries = 0;
    (function wait() {
      if (!window.L) { if (++tries < 40) setTimeout(wait, 100); return; }
      var el = document.getElementById('map'); if (!el) return;
      var map = L.map(el, { scrollWheelZoom: false }).setView([d.latitude, d.longitude], 16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      var shop = L.circleMarker([d.latitude, d.longitude], { radius: 10, weight: 3, color: '#fff', fillColor: '#E5120B', fillOpacity: 1 }).addTo(map).bindTooltip('Shop pin');
      if (d.selfie && d.selfie.latitude != null) {
        var sf = L.circleMarker([d.selfie.latitude, d.selfie.longitude], { radius: 8, weight: 3, color: '#fff', fillColor: '#231F20', fillOpacity: 1 }).addTo(map).bindTooltip('Selfie');
        map.fitBounds(L.featureGroup([shop, sf]).getBounds().pad(0.6), { maxZoom: 17 });
      }
    })();
  }

  // ---------- reports ----------
  var REASONS = { SCAM: 'Scam or fraud', FAKE_OR_COUNTERFEIT: 'Fake / counterfeit part', CONTACT_OUTSIDE_APP: 'Asking to deal outside the app', ABUSIVE: 'Abusive or harassment', INAPPROPRIATE: 'Inappropriate content', WRONG_INFO: 'Wrong or misleading info', SPAM: 'Spam', OTHER: 'Other' };
  var TARGET_ICON = { PRODUCT: 'pkg', STORE: 'store', MESSAGE: 'msg', REVIEW: 'star', CONVERSATION: 'msg' };
  var ACTIONS = {
    dismiss: { title: 'Dismiss this report?', text: 'Nothing changes for the reported user. Use this when the report isn’t valid.', confirm: 'Dismiss', cls: 'btn-navy', icon: 'x', tone: 'navy', done: 'Report dismissed.' },
    remove_content: { title: 'Remove this content?', text: 'The listing, review or message is hidden from everyone straight away.', confirm: 'Remove content', cls: 'btn-primary', icon: 'trash', tone: 'bad', done: 'Content removed.' },
    suspend_store: { title: 'Suspend their store?', text: 'The store and all its listings are hidden until you reinstate it.', confirm: 'Suspend store', cls: 'btn-primary', icon: 'pause', tone: 'bad', done: 'Store suspended.' },
    ban_user: { title: 'Ban this user?', text: 'They’re signed out everywhere and can’t sign in again. Their store is suspended too.', confirm: 'Ban user', cls: 'btn-primary', icon: 'ban', tone: 'bad', done: 'User banned.' }
  };
  function reportsView(status) {
    shell(pageHead('Reports', 'What buyers and sellers have reported about listings, stores, chats and reviews.') +
      '<div class="toolbar"><div class="seg">' + [['OPEN', 'Open'], ['RESOLVED', 'Resolved'], ['DISMISSED', 'Dismissed']].map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (t[0] === status ? 'on' : '') + '">' + t[1] + (t[0] === 'OPEN' ? '<span class="n">' + (state.stats.openReports || 0) + '</span>' : '') + '</button>';
      }).join('') + '</div></div><div id="list">' + skRows(3, false) + '</div>');
    on('[data-tab]', 'click', function (e) { go('reports', e.currentTarget.getAttribute('data-tab')); });
    api('/admin/reports?status=' + status).then(function (rows) {
      if (!rows.length) { $('#list').innerHTML = '<div class="card">' + (status === 'OPEN' ? empty('shield', 'No open reports', 'All caught up — the marketplace is looking clean.') : empty('inbox', 'Nothing here yet', 'No ' + status.toLowerCase() + ' reports.')) + '</div>'; return; }
      $('#list').innerHTML = rows.map(function (r) {
        var p = r.preview || { title: '(deleted)' };
        var t = r.targetUser;
        var canRemove = ['PRODUCT', 'REVIEW', 'MESSAGE'].indexOf(r.targetType) >= 0 && p.active !== false;
        return '<div class="card report" data-id="' + esc(r.id) + '"><div class="report-top"><div class="tile t-red" style="width:34px;height:34px;border-radius:10px">' + ic(TARGET_ICON[r.targetType] || 'flag') + '</div><span class="tag">' + esc(r.targetType.toLowerCase()) + '</span>' + badge(status === 'OPEN' ? 'OPEN' : status, REASONS[r.reason] || r.reason) +
          '<span class="when" title="' + esc(when(r.createdAt)) + '">' + esc(ago(r.createdAt)) + '</span></div>' +
          '<h4>' + esc(p.title) + (p.active === false ? ' ' + badge('SUSPENDED', 'Removed') : '') + '</h4>' + (p.body ? '<div class="quote">' + esc(p.body) + '</div>' : '') +
          (r.details ? '<div class="alert alert-info" style="margin:10px 0 0">' + ic('msg') + '<div><b>Reporter’s note:</b> ' + esc(r.details) + '</div></div>' : '') +
          '<div class="people"><span>' + ic('user') + 'Reported by <b style="color:var(--text)">' + esc(r.reporterName) + '</b> · ' + esc(r.reporterEmail) + '</span>' +
          (t ? '<span>' + ic('alertc') + 'About <b style="color:var(--text)">' + esc(t.fullName) + '</b> · ' + esc(t.email) + ' · reported ' + esc(t.timesReported) + '×' + (t.banned ? ' · ' + badge('BANNED') : '') + '</span>' : '') + '</div>' +
          (status === 'OPEN' ? '<div class="report-actions"><input class="input note-in" placeholder="Add a note for the record (optional)"><button class="btn btn-ghost btn-sm" data-act="dismiss">' + ic('x') + ' Dismiss</button>' +
            (canRemove ? '<button class="btn btn-danger btn-sm" data-act="remove_content">' + ic('trash') + ' Remove content</button>' : '') +
            '<button class="btn btn-danger btn-sm" data-act="suspend_store">' + ic('pause') + ' Suspend store</button>' + (t && !t.banned ? '<button class="btn btn-danger btn-sm" data-act="ban_user">' + ic('ban') + ' Ban user</button>' : '') + '</div>'
            : (r.resolutionNote ? '<div class="report-actions"><span class="hint" style="margin:0">' + ic('check') + ' <b>Decision:</b> ' + esc(r.resolutionNote) + '</span></div>' : '')) + '</div>';
      }).join('');
      on('[data-act]', 'click', function (e) {
        var btn = e.currentTarget;
        var card = btn.closest('[data-id]');
        var act = ACTIONS[btn.getAttribute('data-act')];
        var note = card.querySelector('.note-in').value.trim();
        modal({ icon: act.icon, tone: act.tone, title: act.title, text: act.text, confirm: act.confirm, confirmClass: act.cls }).then(function (ok) {
          if (!ok) return;
          api('/admin/reports/' + card.getAttribute('data-id') + '/resolve', { method: 'POST', body: { action: btn.getAttribute('data-act'), note: note || undefined } })
            .then(function () { toast(act.done); state.stats = null; route(); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
    }).catch(function (e) { $('#list').innerHTML = errBox(e.message); });
  }

  // ---------- users ----------
  var userRows = [], roleFilter = '';
  function usersView(q) {
    shell(pageHead('Users', 'Search by name, email, phone or store. Banned users are signed out immediately.') +
      '<div class="toolbar"><form class="search" id="sf" style="flex:1;max-width:460px">' + ic('search') + '<input class="input" id="q" placeholder="Search name, email, phone or store…" value="' + esc(q) + '"></form>' +
      '<div class="chips">' + [['', 'Everyone'], ['BUYER', 'Buyers'], ['SELLER', 'Sellers'], ['ADMIN', 'Admins']].map(function (c) { return '<button class="chip' + (roleFilter === c[0] ? ' on' : '') + '" data-role="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="grow"></div><span class="hint" id="u-count" style="margin:0"></span></div><div id="list">' + skRows(6) + '</div>');
    $('#sf').addEventListener('submit', function (e) { e.preventDefault(); go('users', $('#q').value.trim()); });
    on('[data-role]', 'click', function (e) {
      roleFilter = e.currentTarget.getAttribute('data-role');
      app.querySelectorAll('[data-role]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-role') === roleFilter); });
      drawUsers(q);
    });
    api('/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (rows) { userRows = rows; drawUsers(q); })
      .catch(function (e) { $('#list').innerHTML = errBox(e.message); });
  }
  var ROLE = { BUYER: ['b-info', 'Buyer'], SELLER: ['b-navy', 'Seller'], ADMIN: ['b-bad', 'Admin'] };
  function drawUsers(q) {
    var rows = userRows.filter(function (u) { return !roleFilter || u.role === roleFilter; });
    var cnt = $('#u-count'); if (cnt) cnt.textContent = rows.length + (rows.length === 1 ? ' user' : ' users') + (userRows.length >= 100 ? ' (first 100)' : '');
    if (!rows.length) { $('#list').innerHTML = '<div class="card">' + empty(q ? 'search' : 'users', q ? 'No users match “' + q + '”' : 'No users yet', q ? 'Try a name, email, phone number or store name.' : '') + '</div>'; return; }
    $('#list').innerHTML = '<div class="card table-wrap"><table class="table"><thead><tr><th>User</th><th class="hide-sm">Contact</th><th>Role</th><th class="hide-sm">Store</th><th class="hide-sm">Joined</th><th>Status</th><th></th></tr></thead><tbody>' +
      rows.map(function (u) {
        var r = ROLE[u.role] || ['b-grey', u.role];
        return '<tr><td><div class="person">' + av(u.fullName) + '<div style="min-width:0"><b>' + esc(u.fullName) + '</b><div class="sub">' + esc(u.city || '—') + '</div></div></div></td>' +
          '<td class="hide-sm">' + esc(u.email) + (u.emailVerified ? ' <span title="Email verified" style="color:var(--ok)">' + ic('okc') + '</span>' : ' <span class="badge b-grey" style="font-size:10.5px;padding:1px 7px">Unverified</span>') + '<div class="sub">' + esc(u.phone || '') + '</div></td>' +
          '<td><span class="badge ' + r[0] + '">' + r[1] + '</span></td><td class="hide-sm">' + (u.storeName ? esc(u.storeName) + '<div style="margin-top:3px">' + badge(u.storeStatus) + '</div>' : '<span style="color:var(--faint)">—</span>') + '</td>' +
          '<td class="hide-sm nowrap">' + esc(day(u.createdAt)) + '</td><td>' + (u.banned ? badge('BANNED') + (u.banReason ? '<div class="sub" style="max-width:180px">' + esc(u.banReason) + '</div>' : '') : badge('ACTIVE')) + '</td><td class="r">' +
          (u.role === 'ADMIN' ? '' : u.banned ? '<button class="btn btn-ghost btn-sm" data-unban="' + esc(u.id) + '" data-name="' + esc(u.fullName) + '">' + ic('refresh') + ' Unban</button>' : '<button class="btn btn-danger btn-sm" data-ban="' + esc(u.id) + '" data-name="' + esc(u.fullName) + '">' + ic('ban') + ' Ban</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    on('[data-ban]', 'click', function (e) {
      var b = e.currentTarget;
      modal({ icon: 'ban', tone: 'bad', title: 'Ban ' + b.getAttribute('data-name') + '?', text: 'They’re signed out everywhere straight away. If they have a store, it’s suspended too.',
        input: { label: 'Reason (kept on record)', placeholder: 'Why are you banning this user?', chips: ['Scam or fraud', 'Selling fake parts', 'Abusive behaviour', 'Spam'] }, confirm: 'Ban user', confirmClass: 'btn-primary' }).then(function (reason) {
        if (!reason) return;
        api('/admin/users/' + b.getAttribute('data-ban') + '/ban', { method: 'POST', body: { reason: reason } }).then(function () { toast(b.getAttribute('data-name') + ' has been banned.'); usersView(state.arg || ''); }).catch(function (err) { toast(err.message, 'bad'); });
      });
    });
    on('[data-unban]', 'click', function (e) {
      var b = e.currentTarget;
      modal({ icon: 'refresh', tone: 'ok', title: 'Unban ' + b.getAttribute('data-name') + '?', text: 'They’ll be able to sign in again. A suspended store stays suspended until you reinstate it.', confirm: 'Unban', confirmClass: 'btn-ok' }).then(function (ok) {
        if (!ok) return;
        api('/admin/users/' + b.getAttribute('data-unban') + '/unban', { method: 'POST', body: {} }).then(function () { toast(b.getAttribute('data-name') + ' can sign in again.'); usersView(state.arg || ''); }).catch(function (err) { toast(err.message, 'bad'); });
      });
    });
  }

  // ---------- audit ----------
  function auditMeta(action) {
    var a = String(action || '');
    if (a.indexOf('login') >= 0) return ['login', 't-navy'];
    if (a.indexOf('view') >= 0 || a.indexOf('document') >= 0) return ['eye', 't-info'];
    if (a.indexOf('approve') >= 0 || a.indexOf('unban') >= 0) return ['check', 't-ok'];
    if (a.indexOf('service') >= 0) return ['tool', 't-info'];
    if (a.indexOf('ban') >= 0) return ['ban', 't-red'];
    if (a.indexOf('reject') >= 0 || a.indexOf('suspend') >= 0) return ['x', 't-red'];
    if (a.indexOf('report') >= 0) return ['flag', 't-warn'];
    if (a.indexOf('password') >= 0 || a.indexOf('2fa') >= 0 || a.indexOf('email') >= 0 || a.indexOf('account') >= 0) return ['key', 't-navy'];
    return ['history', 't-grey'];
  }
  function auditView() {
    shell(pageHead('Audit log', 'Every admin sign-in, document view and decision. Kept for a year.', '<div class="search">' + ic('search') + '<input class="input" id="q" placeholder="Filter by admin, action or note…"></div>') + '<div id="list">' + skRows(6, false) + '</div>');
    api('/admin/audit').then(function (rows) {
      function draw(q) {
        var list = rows.filter(function (a) { return !q || [a.admin, a.action, a.note, a.targetType, a.targetId].join(' ').toLowerCase().indexOf(q) >= 0; });
        if (!list.length) { $('#list').innerHTML = '<div class="card">' + empty('history', q ? 'No matching entries' : 'No activity yet', q ? 'Try a different filter.' : 'Admin actions will be recorded here.') + '</div>'; return; }
        var lastDay = '', html = '';
        list.forEach(function (a) {
          var d = new Date(a.createdAt).toDateString();
          if (d !== lastDay) {
            lastDay = d;
            var label = d === new Date().toDateString() ? 'Today' : d === new Date(Date.now() - 864e5).toDateString() ? 'Yesterday' : day(a.createdAt);
            html += '<div class="tl-day">' + esc(label) + '</div>';
          }
          var m = auditMeta(a.action);
          html += '<div class="tl-item"><div class="tl-ic tile ' + m[1] + '">' + ic(m[0]) + '</div><div class="tl-body"><b>' + esc(cap(String(a.action).replace(/_/g, ' '))) + '</b> <span style="color:var(--muted)">by ' + esc(a.admin || 'unknown') + '</span>' +
            ((a.targetType || a.note) ? '<div class="sub">' + (a.targetType ? esc(a.targetType) + ' <span class="mono" style="font-size:11.5px">' + esc(String(a.targetId || '').slice(0, 12)) + '</span>' : '') + (a.note ? (a.targetType ? ' · ' : '') + esc(a.note) : '') + '</div>' : '') + '</div><div class="tl-time">' + esc(time(a.createdAt)) + '</div></div>';
        });
        $('#list').innerHTML = '<div class="card tl">' + html + '</div>';
      }
      draw('');
      $('#q').addEventListener('input', function (e) { draw(e.target.value.trim().toLowerCase()); });
    }).catch(function (e) { $('#list').innerHTML = errBox(e.message); });
  }

  // ---------- my account settings ----------
  function newSession(r) {
    if (r && r.accessToken) { state.token = r.accessToken; ssSet(r.accessToken); }
  }
  function formMsg(form, text, ok) {
    var el = form.querySelector('.msg');
    el.innerHTML = text ? '<div class="alert ' + (ok ? 'alert-ok' : 'alert-bad') + '">' + ic(ok ? 'okc' : 'alertc') + '<div>' + esc(text) + '</div></div>' : '';
  }
  function strength(pw) {
    var s = 0;
    if (pw.length >= 10) s++;
    if (pw.length >= 14) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    return pw ? Math.max(1, s) : 0;
  }
  function codeField(name, label) {
    return '<div class="field"><label>' + esc(label || 'Authenticator code') + '</label><div class="input-icon">' + ic('shield') + '<input class="input mono" name="' + name + '" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code" required></div></div>';
  }
  function pwField(name, label, ac, extra) {
    return '<div class="field"><label>' + esc(label) + '</label><div class="input-icon">' + ic('lock') + '<input class="input" type="password" name="' + name + '" autocomplete="' + ac + '" required' + (extra || '') + '></div></div>';
  }
  function section(id, icon, tone, title, sub, body, foot, cls) {
    return '<form class="card set-sec' + (cls ? ' ' + cls : '') + '" id="' + id + '" novalidate><div class="sh"><div class="tile ' + tone + '">' + ic(icon) + '</div><div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div></div><div class="sb">' + body + '<div class="msg"></div></div><div class="sf">' + foot + '</div></form>';
  }
  function settingsView() {
    shell(pageHead('Settings', 'Manage your admin account and security.') + '<div class="settings"><div class="sk" style="height:220px;border-radius:14px"></div><div class="sk" style="height:420px;border-radius:18px"></div></div>');
    api('/admin/account').then(function (me) {
      state.admin = { id: me.id, email: me.email, fullName: me.fullName };
      var nav = [['f-appearance', 'sun', 'Appearance'], ['f-profile', 'user', 'Profile'], ['f-password', 'lock', 'Password'], ['f-email', 'mail', 'Sign-in email'], ['f-2fa', 'shield', 'Authenticator'], ['f-sessions', 'logout', 'Sessions']];
      shell(pageHead('Settings', 'Changing your password, email or authenticator needs your current password and an authenticator code.') +
        '<div class="settings"><nav class="set-nav">' + nav.map(function (n, i) { return '<a href="#" data-sec="' + n[0] + '" class="' + (i === 0 ? 'on' : '') + '">' + ic(n[1]) + n[2] + '</a>'; }).join('') + '</nav><div>' +
        '<div class="card set-sec" id="f-appearance"><div class="sh"><div class="tile t-navy">' + ic('sun') + '</div><div><h3>Appearance</h3><p>Choose light or dark, or follow your computer’s setting. Saved on this browser.</p></div></div><div class="sb"><div class="theme-seg">' +
          [['system', 'monitor', 'System'], ['light', 'sun', 'Light'], ['dark', 'moon', 'Dark']].map(function (o) { return '<button type="button" data-theme-pick="' + o[0] + '" class="' + (themePref() === o[0] ? 'on' : '') + '">' + ic(o[1]) + o[2] + '</button>'; }).join('') +
        '</div></div></div>' +
        section('f-profile', 'user', 't-navy', 'Profile', 'How you appear in the audit log.',
          '<div class="profile-card">' + av(me.fullName, 'lg') + '<div><b>' + esc(me.fullName) + '</b><span>' + esc(me.email) + '</span><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><span class="badge b-bad">Admin</span>' + (me.totpEnabledAt ? '<span class="badge b-ok">Two-step on</span>' : '<span class="badge b-warn">Two-step off</span>') + '</div></div></div>' +
          '<div class="row2"><div class="field"><label>Full name</label><input class="input" name="fullName" value="' + esc(me.fullName) + '" required minlength="2"></div><div class="field"><label>Sign-in email</label><input class="input" value="' + esc(me.email) + '" disabled></div></div>' +
          '<div class="hint">Admin since ' + esc(day(me.createdAt)) + (me.totpEnabledAt ? ' · Two-step sign-in on since ' + esc(day(me.totpEnabledAt)) : '') + '</div>',
          '<button class="btn btn-navy">' + ic('check') + ' Save changes</button>') +
        section('f-password', 'lock', 't-navy', 'Change password', 'Use at least 10 characters. Other admin sessions are signed out.',
          pwField('currentPassword', 'Current password', 'current-password') + '<div class="row2"><div>' + pwField('newPassword', 'New password', 'new-password', ' minlength="10"') + '<div class="meter" id="meter"><i></i><i></i><i></i><i></i></div></div><div>' + pwField('repeat', 'Repeat new password', 'new-password') + '</div></div>' + codeField('code'),
          '<span class="hint">You’ll stay signed in on this device.</span><button class="btn btn-navy">' + ic('key') + ' Change password</button>') +
        section('f-email', 'mail', 't-info', 'Change sign-in email', 'A notice is sent to your current email address.',
          '<div class="field"><label>New email</label><div class="input-icon">' + ic('mail') + '<input class="input" type="email" name="newEmail" placeholder="name@autoguide.lk" required></div></div><div class="row2"><div>' + pwField('password', 'Current password', 'current-password') + '</div><div>' + codeField('code') + '</div></div>',
          '<button class="btn btn-navy">' + ic('mail') + ' Change email</button>') +
        section('f-2fa', 'shield', 't-ok', 'Authenticator app', 'Moving to a new phone? Confirm with your password and current code, then scan the new QR code.',
          '<div id="tfa-step"><div class="row2"><div>' + pwField('password', 'Current password', 'current-password') + '</div><div>' + codeField('code', 'Current authenticator code') + '</div></div></div>',
          '<button class="btn btn-navy" id="tfa-btn">' + ic('phone') + ' Set up new authenticator</button>') +
        '<div class="card set-sec danger-zone" id="f-sessions"><div class="sh"><div class="tile t-red">' + ic('logout') + '</div><div><h3>Sign out everywhere</h3><p>Think someone else is signed in to your admin account? This ends every admin session, including this one.</p></div></div><div class="sf"><button class="btn btn-danger" id="logout-all">' + ic('logout') + ' Sign out of all sessions</button></div></div>' +
        '</div></div>');

      on('[data-theme-pick]', 'click', function (e) {
        var p = e.currentTarget.getAttribute('data-theme-pick');
        setTheme(p);
        app.querySelectorAll('[data-theme-pick]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-theme-pick') === p); });
      });
      on('[data-sec]', 'click', function (e) {
        e.preventDefault();
        var id = e.currentTarget.getAttribute('data-sec');
        app.querySelectorAll('[data-sec]').forEach(function (a) { a.classList.toggle('on', a === e.currentTarget); });
        document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      app.querySelectorAll('input[inputmode=numeric]').forEach(function (inp) { inp.addEventListener('input', function () { inp.value = inp.value.replace(/[^0-9]/g, '').slice(0, 6); }); });

      var fp = $('#f-profile');
      fp.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = fp.fullName.value.trim();
        if (name.length < 2) return formMsg(fp, 'Enter your full name.');
        var done = busy(fp.querySelector('.sf .btn'));
        api('/admin/account/profile', { method: 'PATCH', body: { fullName: name } }).then(function () { done(); formMsg(fp, ''); state.admin.fullName = name; toast('Profile saved.'); settingsView(); }).catch(function (err) { done(); formMsg(fp, err.message); });
      });
      var fw = $('#f-password');
      fw.newPassword.addEventListener('input', function () { $('#meter').className = 'meter s' + strength(fw.newPassword.value); });
      fw.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!fw.currentPassword.value) return formMsg(fw, 'Enter your current password.');
        if (fw.newPassword.value.length < 10) return formMsg(fw, 'The new password must be at least 10 characters.');
        if (fw.newPassword.value !== fw.repeat.value) return formMsg(fw, 'The new passwords don’t match.');
        if (fw.code.value.length !== 6) return formMsg(fw, 'Enter the 6-digit code from your authenticator.');
        var done = busy(fw.querySelector('.sf .btn'));
        api('/admin/account/password', { method: 'POST', body: { currentPassword: fw.currentPassword.value, newPassword: fw.newPassword.value, code: fw.code.value.trim() } })
          .then(function (r) { done(); newSession(r); fw.reset(); $('#meter').className = 'meter'; formMsg(fw, 'Password changed. Other sessions were signed out.', true); toast('Password changed.'); })
          .catch(function (err) { done(); formMsg(fw, err.message); });
      });
      var fe = $('#f-email');
      fe.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!fe.newEmail.value.trim() || !fe.password.value || fe.code.value.length !== 6) return formMsg(fe, 'Fill in the new email, your password and the 6-digit code.');
        var done = busy(fe.querySelector('.sf .btn'));
        api('/admin/account/email', { method: 'POST', body: { newEmail: fe.newEmail.value.trim(), password: fe.password.value, code: fe.code.value.trim() } })
          .then(function (r) { newSession(r); state.admin.email = r.email; toast('Sign-in email changed to ' + r.email + '.'); settingsView(); })
          .catch(function (err) { done(); formMsg(fe, err.message); });
      });
      var ft = $('#f-2fa');
      var confirming = false;
      ft.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('#tfa-btn');
        if (!confirming) {
          if (!ft.password.value || ft.code.value.length !== 6) return formMsg(ft, 'Enter your password and current 6-digit code.');
          var done = busy(btn);
          api('/admin/account/2fa/start', { method: 'POST', body: { password: ft.password.value, code: ft.code.value.trim() } }).then(function (s) {
            done(); confirming = true;
            $('#tfa-step').innerHTML = '<div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center" class="tfa-grid"><div class="qr-box" style="margin:0">' + s.qrSvg + '</div><div><p style="margin:0 0 10px;color:var(--muted)">Scan with your new authenticator app, or enter this key:</p><div class="secret" style="text-align:left">' + esc(s.secret) + '</div>' + codeField('newcode', 'Code from the NEW authenticator') + '</div></div>';
            var nc = ft.newcode; nc.addEventListener('input', function () { nc.value = nc.value.replace(/[^0-9]/g, '').slice(0, 6); }); nc.focus();
            btn.innerHTML = ic('check') + ' Confirm new authenticator';
            formMsg(ft, '');
          }).catch(function (err) { done(); formMsg(ft, err.message); });
        } else {
          if (ft.newcode.value.length !== 6) return formMsg(ft, 'Enter the 6-digit code from your new authenticator.');
          var done2 = busy(btn);
          api('/admin/account/2fa/confirm', { method: 'POST', body: { code: ft.newcode.value.trim() } })
            .then(function () { toast('New authenticator is set up. The old one no longer works.'); settingsView(); })
            .catch(function (err) { done2(); formMsg(ft, err.message); });
        }
      });
      $('#logout-all').addEventListener('click', function () {
        modal({ icon: 'logout', tone: 'bad', title: 'Sign out everywhere?', text: 'Every admin session ends, including this one. You’ll need your password and authenticator code to sign back in.', confirm: 'Sign out everywhere', confirmClass: 'btn-primary' }).then(function (ok) {
          if (!ok) return;
          api('/admin/account/logout-all', { method: 'POST', body: {} }).then(function () { signOut('Signed out of all sessions.'); }).catch(function (err) { toast(err.message, 'bad'); });
        });
      });
    }).catch(function (e) { shell(pageHead('Settings') + errBox(e.message)); });
  }

  // ---------- start ----------
  applyTheme();
  if (state.token) {
    api('/admin/auth/me').then(function (me) { state.admin = me; route(); }).catch(function () { if (state.token) signOut(); });
  } else {
    renderLogin();
  }
})();
`;
