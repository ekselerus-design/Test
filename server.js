const express = require('express');
const https = require('https');
const app = express();

app.use(express.urlencoded({ extended: true }));

// Простая функция для HTTP GET-запроса
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

app.all('*', async (req, res) => {
  try {
    const authId = req.body.AUTH_ID;
    const placementOptionsRaw = req.body.PLACEMENT_OPTIONS;

    let taskId = null;
    if (placementOptionsRaw) {
      try {
        const opts = JSON.parse(placementOptionsRaw);
        taskId = opts.taskId;
      } catch (e) {}
    }
    if (!taskId) taskId = req.query.ID;

    if (!taskId) {
      return res.send(errorPage('Не передан ID задачи.'));
    }

    // URL вашего вебхука для получения описания
    const apiUrl = `https://vach.bitrix24.by/rest/32/uy3csu7xk0jek8u1/task.item.getdescription.json?ID=${taskId}`;

    const jsonStr = await fetchUrl(apiUrl);
    const apiResponse = JSON.parse(jsonStr);

    // Извлекаем описание
    let desc = '';
    if (typeof apiResponse.result === 'string') {
      desc = apiResponse.result;
    } else if (apiResponse.result && apiResponse.result.DESCRIPTION) {
      desc = apiResponse.result.DESCRIPTION;
    } else if (apiResponse.result && apiResponse.result.description) {
      desc = apiResponse.result.description;
    }

    if (!desc) {
      const errDetail = apiResponse.error
        ? 'Ошибка API: ' + JSON.stringify(apiResponse.error)
        : 'Поля результата: ' + (apiResponse.result ? Object.keys(apiResponse.result).join(', ') : 'нет');
      return res.send(errorPage(`Не удалось получить описание. ${errDetail}`));
    }

    // Очищаем HTML-теги
    desc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const marker = 'Документы по адресу ';
    const idx = desc.indexOf(marker);
    if (idx === -1) {
      return res.send(errorPage('В описании не найдена фраза «Документы по адресу».'));
    }

    let rawPath = desc.substring(idx + marker.length).trim();
    rawPath = rawPath.replace(/<[^>]*>/g, '').trim();

    if (!rawPath) {
      return res.send(errorPage('Не удалось извлечь путь к папке.'));
    }

    // Преобразуем UNC-путь: \\ -> / и убираем ведущие слеши
    const cleanPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    // ВАЖНО: НЕ кодируем пробелы и кириллицу, чтобы проводник открыл папку корректно
    const link = `networkfolder://${cleanPath}`;

    res.send(successPage(rawPath, link));

  } catch (e) {
    res.send(errorPage('Ошибка сервера: ' + e.message));
  }
});

function successPage(rawPath, link) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Открыть папку</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; padding: 30px; background: #f9f9f9; text-align: center; }
    .btn { display: inline-block; padding: 14px 28px; margin: 20px 0; background-color: #2fc6f6; color: white !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: background-color 0.2s; cursor: pointer; }
    .btn:hover { background-color: #1b6d8c; }
    .path { margin-top: 15px; font-size: 14px; color: #555; word-break: break-all; }
  </style>
</head>
<body>
  <h2>📂 Документы по задаче</h2>
  <a href="${link}" class="btn">📂 Открыть папку в проводнике</a>
  <div class="path">Сетевой путь:<br>${rawPath}</div>
  <p style="margin-top: 25px; color: #888; font-size: 13px;">Если кнопка не сработала, скопируйте путь выше и вставьте в адресную строку Проводника.</p>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Ошибка</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; padding: 30px; background: #f9f9f9; text-align: center; }
    .error { color: #c33; margin-top: 20px; }
  </style>
</head>
<body>
  <h2>📂 Документы по задаче</h2>
  <p class="error">${message}</p>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
