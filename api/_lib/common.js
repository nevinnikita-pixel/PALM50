const crypto = require('crypto');

const PRODUCTS = {
  royal_hand: {
    title: 'Royal Palm',
    description: 'Royal Palm cosmetic skin',
    stars: 99,
    permanent: true
  },

  meme_reactions: {
    title: 'Meme Pack',
    description: 'PALM 50 meme reactions pack',
    stars: 59,
    permanent: true
  },

  vip_reactions: {
    title: 'VIP Pack',
    description: 'PALM 50 VIP reactions pack',
    stars: 79,
    permanent: true
  },

  palm_plus_monthly: {
    title: 'PALM PLUS',
    description: 'PALM PLUS for 30 days',
    stars: 199,
    permanent: false
  }
};


function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}


function env(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error('Missing environment variable: ' + name);
  }

  return String(value).trim();
}


function body(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}


function validateInitData(initData) {
  const token = env('TELEGRAM_BOT_TOKEN');

  if (!initData) {
    throw new Error('Telegram initData is required');
  }

  const params = new URLSearchParams(initData);

  const gotHash = params.get('hash');

  if (!gotHash) {
    throw new Error('Telegram initData hash missing');
  }

  params.delete('hash');

  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + '=' + value)
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(token)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');

  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(gotHash, 'hex');

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    throw new Error('Invalid Telegram initData');
  }

  const authDate = Number(params.get('auth_date') || 0);

  if (
    !authDate ||
    Math.abs(Date.now() / 1000 - authDate) > 86400
  ) {
    throw new Error('Telegram initData expired');
  }

  const user = JSON.parse(
    params.get('user') || '{}'
  );

  if (!user.id) {
    throw new Error('Telegram user missing');
  }

  return user;
}


async function tg(method, payload) {
  const token = env('TELEGRAM_BOT_TOKEN');

  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description || 'Telegram error'
    );
  }

  return data.result;
}


/* ============================= */
/* SUPABASE                       */
/* ============================= */

function supabaseBaseUrl() {
  let value = env('SUPABASE_URL');

  // Убираем пробелы
  value = value.trim();

  // Убираем query/hash, если случайно попали
  value = value.split('?')[0].split('#')[0];

  // Убираем /rest/v1 и всё после него
  value = value.replace(
    /\/rest\/v1(?:\/.*)?$/i,
    ''
  );

  // Убираем конечные /
  value = value.replace(/\/+$/, '');

  if (!/^https:\/\/.+\.supabase\.co$/i.test(value)) {
    throw new Error(
      'Invalid SUPABASE_URL: ' + value
    );
  }

  return value;
}


function supabaseUrl(path = '') {
  const cleanPath = String(path)
    .trim()
    .replace(/^\/+/, '');

  return (
    supabaseBaseUrl() +
    '/rest/v1/' +
    cleanPath
  );
}


function headers(prefer) {
  const key = env(
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  const result = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  if (prefer) {
    result.Prefer = prefer;
  }

  return result;
}


async function parseSupabaseResponse(response) {
  const text = await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = {
      message: text
    };
  }

  if (!response.ok) {
    console.error(
      'SUPABASE ERROR',
      response.status,
      response.url,
      data
    );

    throw new Error(
      data?.message ||
      data?.error ||
      `Supabase ${response.status}`
    );
  }

  return data;
}


async function sel(path) {
  const response = await fetch(
    supabaseUrl(path),
    {
      method: 'GET',
      headers: headers()
    }
  );

  return parseSupabaseResponse(response);
}


async function ins(table, row) {
  const response = await fetch(
    supabaseUrl(table),
    {
      method: 'POST',
      headers: headers(
        'return=representation'
      ),
      body: JSON.stringify(row)
    }
  );

  const data =
    await parseSupabaseResponse(
      response
    );

  return Array.isArray(data)
    ? data[0]
    : data;
}


async function patch(path, row) {
  const response = await fetch(
    supabaseUrl(path),
    {
      method: 'PATCH',
      headers: headers(
        'return=representation'
      ),
      body: JSON.stringify(row)
    }
  );

  const data =
    await parseSupabaseResponse(
      response
    );

  return Array.isArray(data)
    ? data[0]
    : data;
}


function product(id) {
  if (!PRODUCTS[id]) {
    throw new Error(
      'Unknown product: ' + id
    );
  }

  return PRODUCTS[id];
}


module.exports = {
  PRODUCTS,
  json,
  body,
  validateInitData,
  tg,
  sel,
  ins,
  patch,
  product
};
