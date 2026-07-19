const PRODUCTS = Object.freeze({
  'rose-raspberry': { name: 'Rózsa–málna', price: 790 },
  'salted-pistachio': { name: 'Sós pisztácia', price: 850 },
  'lemon-meringue': { name: 'Citromhab', price: 750 },
  'dark-chocolate': { name: 'Étcsokoládé', price: 820 }
});

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
});

const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const escapeHtml = value => clean(value, 2000).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const money = value => new Intl.NumberFormat('hu-HU', {
  style: 'currency', currency: 'HUF', maximumFractionDigits: 0
}).format(value);

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) return null;
  const quantities = new Map();
  for (const item of items) {
    if (!item || !PRODUCTS[item.id] || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 24) return null;
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }
  const normalized = [...quantities].map(([id, quantity]) => ({ id, quantity, ...PRODUCTS[id] }));
  return normalized.reduce((sum, item) => sum + item.quantity, 0) <= 48 ? normalized : null;
}

async function sendEmail(apiKey, idempotencyKey, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(message)
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Resend error:', response.status, details);
    throw new Error('E-mail delivery failed');
  }
  return response.json();
}

export default async request => {
  if (request.method !== 'POST') return json({ error: 'Nem támogatott kérés.' }, 405);

  if (process.env.URL) {
    const expectedOrigin = new URL(process.env.URL).origin;
    const requestOrigin = request.headers.get('origin');
    if (!requestOrigin || requestOrigin !== expectedOrigin) {
      return json({ error: 'Nem engedélyezett forrás.' }, 403);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Hibás rendelési adatok.' }, 400);
  }

  // A rejtett mezőt csak robotok töltik ki; nekik sikeresnek látszó választ adunk.
  if (clean(body.website)) return json({ ok: true });

  const customer = {
    name: clean(body.customer?.name, 100),
    email: clean(body.customer?.email, 200).toLowerCase(),
    phone: clean(body.customer?.phone, 50)
  };
  const delivery = body.delivery === 'delivery' ? 'delivery' : body.delivery === 'pickup' ? 'pickup' : null;
  const address = clean(body.address, 300);
  const note = clean(body.note, 1000);
  const items = normalizeItems(body.items);
  const submittedRequestId = clean(body.requestId, 50);
  const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submittedRequestId)
    ? submittedRequestId
    : crypto.randomUUID();

  if (!customer.name || !customer.phone || !/^\S+@\S+\.\S+$/.test(customer.email)) {
    return json({ error: 'Kérjük, ellenőrizd a nevet, az e-mail-címet és a telefonszámot.' }, 400);
  }
  if (!delivery || (delivery === 'delivery' && !address)) {
    return json({ error: 'Kérjük, add meg az átvétel módját és szükség esetén a címet.' }, 400);
  }
  if (!items) return json({ error: 'A kosár tartalma hibás vagy üres.' }, 400);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('Missing RESEND_API_KEY');
    return json({ error: 'Az e-mail-küldés még nincs konfigurálva.' }, 503);
  }

  const orderEmail = process.env.ORDER_EMAIL || 'tiborcz.kiss@gmail.hu';
  const fromEmail = process.env.RESEND_FROM || 'Makaranya <onboarding@resend.dev>';
  const orderId = `MAK-${requestId.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryLabel = delivery === 'delivery' ? 'Kiszállítás — egyeztetés alapján' : 'Személyes átvétel';
  const itemRows = items.map(item => `<tr><td style="padding:8px 0">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:8px 0;text-align:right">${money(item.price * item.quantity)}</td></tr>`).join('');
  const itemText = items.map(item => `${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`).join('\n');

  const merchantHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#34241f">
    <h1 style="font-family:Georgia,serif">Új Makaranya rendelés</h1><p><strong>Rendelésszám:</strong> ${orderId}</p>
    <table style="width:100%;border-collapse:collapse">${itemRows}<tr style="border-top:1px solid #34241f"><td style="padding-top:12px"><strong>Összesen</strong></td><td style="padding-top:12px;text-align:right"><strong>${money(total)}</strong></td></tr></table>
    <h2 style="font-family:Georgia,serif;margin-top:30px">Vásárló</h2><p>${escapeHtml(customer.name)}<br>${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}</p>
    <p><strong>Átvétel:</strong> ${deliveryLabel}${address ? `<br><strong>Cím:</strong> ${escapeHtml(address)}` : ''}</p>
    ${note ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(note).replaceAll('\n', '<br>')}</p>` : ''}
    <p style="color:#806b64;font-size:12px">A rendelés fizetést még nem tartalmaz; a részleteket a vásárlóval egyeztetni kell.</p>
  </div>`;
  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#34241f">
    <h1 style="font-family:Georgia,serif">Köszönjük a rendelésed!</h1><p>Kedves ${escapeHtml(customer.name)}!</p>
    <p>Megkaptuk a <strong>${orderId}</strong> számú rendelési igényedet. Hamarosan jelentkezünk az átvétel és a fizetés részleteivel.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0">${itemRows}<tr style="border-top:1px solid #34241f"><td style="padding-top:12px"><strong>Termékek összesen</strong></td><td style="padding-top:12px;text-align:right"><strong>${money(total)}</strong></td></tr></table>
    <p><strong>Átvétel:</strong> ${deliveryLabel}</p><p style="color:#806b64;font-size:12px">Ez az üzenet a rendelési igény beérkezését igazolja vissza, nem fizetési bizonylat.</p>
  </div>`;

  try {
    await Promise.all([
      sendEmail(resendKey, `${orderId}-merchant`, {
        from: fromEmail,
        to: [orderEmail],
        reply_to: customer.email,
        subject: `Új rendelés: ${orderId} — ${money(total)}`,
        html: merchantHtml,
        text: `Új Makaranya rendelés\n${orderId}\n\n${itemText}\nÖsszesen: ${money(total)}\n\nVásárló: ${customer.name}\nE-mail: ${customer.email}\nTelefon: ${customer.phone}\nÁtvétel: ${deliveryLabel}${address ? `\nCím: ${address}` : ''}${note ? `\nMegjegyzés: ${note}` : ''}`
      }),
      sendEmail(resendKey, `${orderId}-customer`, {
        from: fromEmail,
        to: [customer.email],
        reply_to: orderEmail,
        subject: `Megkaptuk a rendelésed — ${orderId}`,
        html: customerHtml,
        text: `Kedves ${customer.name}!\n\nMegkaptuk a ${orderId} számú rendelési igényedet.\n\n${itemText}\nTermékek összesen: ${money(total)}\nÁtvétel: ${deliveryLabel}\n\nHamarosan jelentkezünk a részletekkel.`
      })
    ]);
    return json({ ok: true, orderId });
  } catch {
    return json({ error: 'Az e-mailt most nem sikerült elküldeni. Kérjük, próbáld újra később.' }, 502);
  }
};
