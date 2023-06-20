import { Req, Res } from "@/@types/heraless";
import { botHandler } from "../../../../utils/botHandler";
import { lzw_encode } from "../../../../utils/encode";
import prisma from "../../../../utils/prisma";

export async function GET(req: Req, res: Res) {
  try {
    const link = req.params.link;
    if (
      botHandler(
        req,
        res,
        `/t/${link}`,
        "Shared text by someone / " + link,
        true
      )
    )
      return;
    let to = await prisma.textLink.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to)
      return res.send({
        s: false,
        r: "https://poi.kr/errors/text" + `?i=${link}`,
      });

    if (to.expireAfter.getTime() < Date.now()) {
      await prisma.textLink.delete({
        where: {
          from: lzw_encode(link),
        },
      });
      return res.send({ s: false, r: "https://poi.kr/errors/text" });
    }

    if (to.maxUsage != -1) {
      if (to.maxUsage <= 1)
        await prisma.textLink.delete({
          where: {
            from: lzw_encode(link),
          },
        });
      else
        await prisma.textLink.update({
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
    return res.send({
      s: true,
      e: to.text,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
}
