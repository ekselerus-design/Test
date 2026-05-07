exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Папка договоров</title>
<style>body { font-family: sans-serif; padding: 30px; text-align: center; } .btn { ... }</style></head>
<body><h2>📂 Договоры 2026</h2><a href="file://///PROMSRV/Docs/Promarmservice%20Ltd/...">Открыть папку</a></body>
</html>`
  };
};
