// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  time: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  var msg:Data = {time:Date.now().toString()}
  res.status(200).json(msg)
}
