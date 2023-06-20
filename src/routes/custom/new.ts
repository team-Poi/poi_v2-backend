import { Req, Res } from "@/@types/heraless";
import { lzw_encode } from "../../utils/encode";
import prisma from "../../utils/prisma";

export async function POST(req: Req, res: Res) {
  try {
    const to = req.body.to;
    const from = req.body.from;
    const maxUsage = req.body.usage;
    const expire = req.body.expire;

    if (
      !to ||
      !from ||
      typeof maxUsage != "number" ||
      typeof expire != "number"
    )
      return res.send({
        s: false,
        e: "Invalid Query",
      });
    let x = await prisma.customLink.findFirst({
      where: {
        from: lzw_encode(from as string),
      },
    });

    if (x) {
      if (x.expireAfter > new Date())
        return res.send({
          s: false,
          e: "Elready Exsists",
        });
      await prisma.customLink.delete({
        where: {
          from: lzw_encode(from as string),
        },
      });
    }
    await prisma.customLink.create({
      data: {
        from: lzw_encode(from as string),
        to: lzw_encode(to as string),
        maxUsage: maxUsage,
        expireAfter: new Date(Date.now() + expire * 1000),
      },
    });
    return res.send({
      s: true,
      e: from,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      s: false,
      e: "Internal Server Error",
    });
  }
}
