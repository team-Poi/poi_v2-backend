import { Req, Res } from "@/@types/heraless";
import { lzw_encode } from "../../../../utils/encode";
import prisma from "../../../../utils/prisma";

export async function GET(req: Req, res: Res) {
  try {
    const link = req.params.link;
    let to = await prisma.textLink.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to)
      return res.status(404).send({
        s: false,
        e: "Not found",
      });

    if (to.expireAfter.getTime() < Date.now()) {
      await prisma.textLink.delete({
        where: {
          from: lzw_encode(link),
        },
      });
      return res.status(404).send({
        s: false,
        e: "Not found",
      });
    }

    if (to.maxUsage != -1) {
      if (to.maxUsage <= 1) {
        prisma.textLink.delete({
          where: {
            from: lzw_encode(link),
          },
        });
      } else
        await prisma.link.update({
          where: {
            from: lzw_encode(link),
          },
          data: {
            maxUsage: {
              decrement: 1,
            },
          },
        });
    }
    return res.send(to.text);
  } catch (e) {
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
}
