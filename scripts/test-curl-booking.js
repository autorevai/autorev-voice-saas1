// scripts/test-curl-booking.js
const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a));
(async () => {
  const base = process.env.PUBLIC_APP_URL;
  if (!base) throw new Error('Set PUBLIC_APP_URL in Vercel env');
  const res = await fetch(`${base}/api/tools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tool-name': 'create_booking',
      'x-shared-secret': `Bearer ${process.env.WEBHOOK_SHARED_SECRET}`,
    },
    body: JSON.stringify({
      name: 'Test User',
      phone: '+14075551234',
      address: '123 Main',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
      window: '8 to 11',
      summary: 'AC not cooling',
      equipment: 'central AC',
    }),
  });
  console.log(res.status, await res.json());
})();
