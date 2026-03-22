export function downloadApp() {
  const url = window.location.href;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SmartPark</title>
  <meta http-equiv="refresh" content="0; url=${url}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; gap: 1.25rem; padding: 2rem; }
    .logo { width: 88px; height: 88px; background: oklch(0.55 0.22 210); border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto; box-shadow: 0 0 40px oklch(0.55 0.22 210 / 0.4); }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; }
    p { color: #8b949e; max-width: 320px; font-size: 0.9rem; line-height: 1.6; }
    a { color: #58a6ff; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; background: oklch(0.55 0.22 210 / 0.15); border: 1px solid oklch(0.55 0.22 210 / 0.3); color: #58a6ff; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 999px; }
  </style>
</head>
<body>
  <div class="logo">🅿</div>
  <h1>SmartPark</h1>
  <span class="badge">Smart Parking System</span>
  <p>Opening SmartPark app... If it does not open automatically, <a href="${url}">tap here to launch</a>.</p>
  <p style="font-size:0.78rem">Save this file to your device and open it anytime to launch SmartPark.</p>
  <script>window.location.replace("${url}");<\/script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "SmartPark.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
