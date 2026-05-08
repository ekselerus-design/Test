const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.all('*', (req, res) => {
  const authId = req.body.AUTH_ID;
  const placementOptionsRaw = req.body.PLACEMENT_OPTIONS;

  let taskId = null;
  let accessToken = authId;

  if (placementOptionsRaw) {
    try {
      const opts = JSON.parse(placementOptionsRaw);
      taskId = opts.taskId;
    } catch (e) {}
  }

  if (!taskId) taskId = req.query.ID;
  if (!accessToken) accessToken = req.query.access_token;

  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Открыть папку</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; padding: 30px; background: #f9f9f9; text-align: center; }
    .btn { display: inline-block; padding: 14px 28px; margin: 20px 0; background-color: #2fc6f6; color: white !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: background-color 0.2s; cursor: pointer; }
    .btn:hover { background-color: #1b6d8c; }
    .path { margin-top: 15px; font-size: 14px; color: #555; word-break: break-all; }
    .error { color: #c33; margin-top: 20px; }
  </style>
</head>
<body>
  <h2>📂 Документы по задаче</h2>
  <div id="app"><p>Загрузка данных задачи…</p></div>
  <script>
    var __taskId = '${taskId || ""}';
    var __accessToken = '${accessToken || ""}';

    (async function() {
      var appEl = document.getElementById("app");
      if (!__taskId || !__accessToken) {
        appEl.innerHTML = '<p class="error">Не удалось получить параметры задачи.</p>';
        return;
      }
      try {
        var url = "https://vach.bitrix24.by/rest/32/uy3csu7xk0jek8u1/task.item.getdescription.json?ID=" + __taskId;
        var resp = await fetch(url);
        var data = await resp.json();

              var desc = '';
        if (data.result) {
          if (typeof data.result === 'string') {
            desc = data.result;
          } else if (data.result.DESCRIPTION) {
            desc = data.result.DESCRIPTION;
          } else if (data.result.description) {
            desc = data.result.description;
          }
        }

        if (!desc) {
          var debugInfo = '';
          if (data.result) {
            debugInfo = '<br>Тип результата: ' + typeof data.result;
            if (typeof data.result === 'object') {
              debugInfo += '<br>Поля: ' + Object.keys(data.result).join(', ');
            }
          } else if (data.error) {
            debugInfo = '<br>Ошибка API: ' + JSON.stringify(data.error);
          }
          appEl.innerHTML = '<p class="error">Не удалось получить описание.' + debugInfo + '</p>';
          return;
        }

        // Очищаем HTML-теги
        desc = desc.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();

        var marker = "Документы по адресу ";
        var idx = desc.indexOf(marker);
        if (idx === -1) {
          appEl.innerHTML = '<p class="error">В описании не найдена фраза «Документы по адресу».</p>';
          return;
        }

        var rawPath = desc.substring(idx + marker.length).trim();
        rawPath = rawPath.replace(/<[^>]*>/g, "").trim();
        if (!rawPath) {
          appEl.innerHTML = '<p class="error">Не удалось извлечь путь к папке.</p>';
          return;
        }

        // ---- Исправленное преобразование пути ----
        // 1. Меняем все обратные слеши на прямые
        var cleanPath = rawPath.replace(/\\/g, '/');
        // 2. Убираем возможные ведущие прямые слеши (чтобы не получилось networkfolder:////PROMSRV...)
        cleanPath = cleanPath.replace(/^\/+/, '');
        // 3. Кодируем каждую часть пути
        var encodedPath = cleanPath.split('/').map(function(p) { return encodeURIComponent(p); }).join('/');
        var link = "networkfolder://" + encodedPath;

        // Временная диагностика — покажем, что получилось (потом можно убрать)
        var debugText = '<p style="font-size:12px; color:#888;">Отладка:<br>rawPath: ' + rawPath + '<br>cleanPath: ' + cleanPath + '<br>URL: ' + link + '</p>';

        appEl.innerHTML = '<a href="' + link + '" class="btn">📂 Открыть папку в проводнике</a>' +
          '<div class="path">Сетевой путь:<br>' + rawPath + '</div>' +
          debugText +
          '<p style="margin-top: 25px; color: #888; font-size: 13px;">Если кнопка не сработала, скопируйте путь выше и вставьте в адресную строку Проводника.</p>';
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
