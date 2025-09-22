import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('content-type', 'application/json');
  res.status(200).json({ ok: true, route: 'pages/api/ping', method: req.method });
}
