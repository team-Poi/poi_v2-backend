import { Req, Res } from "@/@types/heraless";
import { botHandler } from "../../../../utils/botHandler";
import { lzw_decode, lzw_encode } from "../../../../utils/encode";
import prisma from "../../../../utils/prisma";

export async function GET(req: Req, res: Res) {
  try {
    const link = req.params.link;

    if (botHandler(req, res, `/${link}`, "Shorted link by someone / " + link))
      return;
    let to = await prisma.link.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to)
      return res
        .status(302)
        .redirect("https://poi.kr/errors/link" + `?i=${link}`);

    if (to.expireAfter.getTime() < Date.now()) {
      await prisma.link.delete({
        where: {
          from: lzw_encode(link),
        },
      });
      return res.status(302).redirect("https://poi.kr/errors/link");
    }

    if (to.maxUsage != -1) {
      if (to.maxUsage <= 1)
        await prisma.link.delete({
          where: {
            from: lzw_encode(link),
          },
        });
      else
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
    return res.status(301).redirect(lzw_decode(to.to));
  } catch (e) {
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
}
