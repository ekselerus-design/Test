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

  // Безопасно экранируем значения для вставки в JS-строку
  const safeTaskId = (taskId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeToken = (accessToken || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
    .debug { font-size: 12px; color: #888; margin-top: 10px; background: #f0f0f0; padding: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>📂 Документы по задаче</h2>
  <div id="app"><p>Загрузка данных задачи…</p></div>

  <script>
    // Параметры переданы сервером безопасно
    var __taskId = '${safeTaskId}';
    var __accessToken = '${safeToken}';

    console.log('🟢 Приложение загружено');
    console.log('taskId:', __taskId);
    console.log('accessToken:', __accessToken.substring(0, 8) + '...');

    (async function() {
      var appEl = document.getElementById('app');
      try {
        if (!__taskId || !__accessToken) {
          throw new Error('Параметры задачи пусты. taskId=' + __taskId + ', token=' + (__accessToken ? 'есть' : 'нет'));
        }

        console.log('➡️ Выполняем запрос к REST API...');
        var url = 'https://vach.bitrix24.by/rest/32/uy3csu7xk0jek8u1/task.item.getdescription.json?ID=' + __taskId;
        var resp = await fetch(url);
        var json = await resp.json();
        console.log('📦 Ответ API:', json);

        var desc = '';
        if (typeof json.result === 'string') {
          desc = json.result;
        } else if (json.result && json.result.DESCRIPTION) {
          desc = json.result.DESCRIPTION;
        } else if (json.result && json.result.description) {
          desc = json.result.description;
        }

        if (!desc) {
          var debugInfo = '';
          if (json.error) {
            debugInfo = ' Ошибка API: ' + JSON.stringify(json.error);
          } else if (json.result) {
            debugInfo = ' Поля результата: ' + Object.keys(json.result).join(', ');
          }
          throw new Error('Не удалось получить описание.' + debugInfo);
        }

        console.log('📝 Описание получено, длина:', desc.length);
        // Очищаем HTML-теги
        desc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        var marker = 'Документы по адресу ';
        var idx = desc.indexOf(marker);
        if (idx === -1) {
          throw new Error('В описании не найдена фраза «Документы по адресу».');
        }

        var rawPath = desc.substring(idx + marker.length).trim();
        rawPath = rawPath.replace(/<[^>]*>/g, '').trim();
        if (!rawPath) {
          throw new Error('Не удалось извлечь путь к папке.');
        }

        console.log('📁 Исходный путь:', rawPath);
        // Преобразуем UNC-путь в формат networkfolder://...
        var cleanPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
        var encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
        var link = 'networkfolder://' + encodedPath;
        console.log('🔗 Итоговая ссылка:', link);

        appEl.innerHTML =
          '<a href="' + link + '" class="btn">📂 Открыть папку в проводнике</a>' +
          '<div class="path">Сетевой путь:<br>' + rawPath + '</div>' +
          '<div class="debug">Отладка:<br>rawPath: ' + rawPath + '<br>cleanPath: ' + cleanPath + '<br>URL: ' + link + '</div>' +
          '<p style="margin-top: 25px; color: #888; font-size: 13px;">Если кнопка не сработала, скопируйте путь выше и вставьте в адресную строку Проводника.</p>';

      } catch (e) {
        console.error('❌ Ошибка:', e.message);
        appEl.innerHTML = '<p class="error">' + e.message + '</p>';
      }
    })();
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
