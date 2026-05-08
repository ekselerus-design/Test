const express = require('express');
const app = express();

app.all('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Открыть папку</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 30px; background: #f9f9f9; text-align: center; }
    .btn {
      display: inline-block; padding: 14px 28px; margin: 20px 0;
      background-color: #2fc6f6; color: white !important; text-decoration: none;
      border-radius: 8px; font-size: 16px; font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: background-color 0.2s;
      cursor: pointer;
    }
    .btn:hover { background-color: #1b6d8c; }
    .path { margin-top: 15px; font-size: 14px; color: #555; word-break: break-all; }
    .error { color: #c33; margin-top: 20px; }
  </style>
</head>
<body>
  <h2>📂 Документы по задаче</h2>
  <div id="app">
    <p>Загрузка данных задачи…</p>
  </div>
  <script>
    (async function() {
      const appEl = document.getElementById('app');
      
      const urlParams = new URLSearchParams(window.location.search);
      const taskId = urlParams.get('taskId');
      const accessToken = urlParams.get('access_token');
      
      if (!taskId || !accessToken) {
        appEl.innerHTML = '<p class="error">Не удалось получить параметры задачи. Убедитесь, что приложение является встраиваемым и открыто внутри задачи.</p>';
        return;
      }

      try {
        const response = await fetch(
          'https://vach.bitrix24.by/rest/tasks.task.get.json?auth=' + accessToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'taskId=' + taskId
          }
        );
        const data = await response.json();
        
        if (!data.result || !data.result.description) {
          appEl.innerHTML = '<p class="error">В задаче нет описания.</p>';
          return;
        }

        const descriptionHtml = data.result.description;
        // Очищаем HTML-теги
        const cleanText = descriptionHtml.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
        
        const marker = 'Документы по адресу ';
        const markerIndex = cleanText.indexOf(marker);
        if (markerIndex === -1) {
          appEl.innerHTML = '<p class="error">В описании не найдена фраза «Документы по адресу».</p>';
          return;
        }

        let rawPath = cleanText.substring(markerIndex + marker.length).trim();
        rawPath = rawPath.replace(/<[^>]*>/g, '').trim();
        
        if (!rawPath) {
          appEl.innerHTML = '<p class="error">Не удалось извлечь путь к папке.</p>';
          return;
        }

        // Кодируем путь
        const encodedPath = rawPath
          .replace(/\\\\/g, '/')
          .split('/').map(function(part) { return encodeURIComponent(part); }).join('/');
          
        const networkLink = 'networkfolder://' + encodedPath;
        
        // Формируем кнопку
        appEl.innerHTML = '<a href="' + networkLink + '" class="btn">📂 Открыть папку в проводнике</a>' +
          '<div class="path">Сетевой путь:<br>' + rawPath + '</div>' +
          '<p style="margin-top: 25px; color: #888; font-size: 13px;">Если кнопка не сработала, скопируйте путь выше и вставьте в адресную строку Проводника.</p>';
      } catch (err) {
        console.error(err);
        appEl.innerHTML = '<p class="error">Ошибка при получении данных задачи.</p>';
      }
    })();
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
