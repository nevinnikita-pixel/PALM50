PALM50 — ПОЛНЫЙ ПАКЕТ ДЛЯ GITHUB + VERCEL

1. В GitHub репозитории PALM50 оставь структуру папок как в этом архиве.
2. index.html должен лежать в корне.
3. Папку api НЕ переименовывай и не вытаскивай файлы из неё.
4. Папку scripts тоже оставь как есть.
5. terms.html и privacy.html — в корне.
6. sql/ в Vercel не выполняется автоматически. SQL запускается вручную в Supabase SQL Editor.

После загрузки GitHub сделает commit, Vercel автоматически задеплоит.
Проверь: https://palm50-2.vercel.app/api/health
Ожидается JSON с "ok": true.

Если /api/health показывает false по переменным, добавь/проверь в Vercel Environment Variables:
TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME
TELEGRAM_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
SUPPORT_CONTACT
TERMS_URL

ВАЖНО: TELEGRAM_BOT_TOKEN и SUPABASE_SERVICE_ROLE_KEY никогда не вставлять в index.html.

Для Stars сначала выполни в Supabase: sql/release.sql
Для PvP/matchmaking: sql/MATCHMAKING_FIX.sql (если ещё не выполнял).
