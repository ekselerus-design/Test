const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.all('*', (req, res) => {
  const authId = req.body.AUTH_ID;
  const placementOptionsRaw = req.body.PLACEMENT_OPTIONS;

  let taskId = null;
  let accessToken = authId;

  // Парсим PLACEMENT_OPTIONS, если есть
  if (placementOptionsRaw) {
    try {
      const opts = JSON.parse(placementOptionsRaw);
      taskId = opts.taskId;
    } catch (e) {}
  }

  // Если не нашли в POST, пробуем GET (на случай прямого открытия)
  if (!taskId) taskId = req.query.taskId;
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
        var resp = await fetch("https://vach.bitrix24.by/rest/tasks.task.get.json?auth=" + __accessToken, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "taskId=" + __taskId
        });
        var data = await resp.json();
        if (!data.result || !data.result.description) {
          appEl.innerHTML = '<p class="error">В задаче нет описания.</p>';
          return;
        }
        var desc = data.result.description.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
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
        var encodedPath = rawPath.replace(/\\\\/g, "/").split("/").map(function(p) { return encodeURIComponent(p); }).join("/");
        var link = "networkfolder://" + encodedPath;
        appEl.innerHTML = '<a href="' + link + '" class="btn">📂 Открыть папку в проводнике</a><div class="path">Сетевой путь:<br>' + rawPath + '</div><p style="margin-top: 25px; color: #888; font-size: 13px;">Если кнопка не сработала, скопируйте путь выше и вставьте в адресную строку Проводника.</p>';
      } catch (e) {
        console.error(e);
        appEl.innerHTML = '<p class="error">Ошибка при получении данных задачи.</p>';
      }
    })();
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
