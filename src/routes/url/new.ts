import { Req, Res } from "@/@types/heraless";
import { lzw_encode } from "../../utils/encode";
import getWord from "../../utils/rand/kor/getWord";
import prisma from "../../utils/prisma";
import { randWordEng } from "../../utils/rand";

export async function POST(req: Req, res: Res) {
  let isEng = req.body.eng;
  let to = req.body.to;
  let usage = req.body.usage;
  let expire = req.body.expire;

  if (
    typeof to == "undefined" ||
    typeof isEng == "undefined" ||
    typeof usage != "number" ||
    typeof expire != "number"
  )
    return res.send({
      s: false,
      e: "Invalid Query",
    });

  try {
    const getID = () => {
      if (isEng) return randWordEng(6);
      return getWord();
    };
    let id = getID();
    while (true) {
      let thing = await prisma.link.findFirst({
        where: {
          from: lzw_encode(id),
        },
      });
      if (!thing) break;
      if (thing.expireAfter < new Date())
        await prisma.link.delete({
          where: {
            from: lzw_encode(id),
          },
        });

      id = getID();
    }

    await prisma.link.create({
      data: {
        from: lzw_encode(id),
        to: lzw_encode(to),
        maxUsage: usage,
        expireAfter: new Date(Date.now() + expire * 1000),
      },
    });

    return res.send({
      s: true,
      e: id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      s: false,
      e: "Internal Server Error",
    });
  }
}
