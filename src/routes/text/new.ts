import { Req, Res } from "@/@types/heraless";
import { lzw_encode } from "../../utils/encode";
import getWord from "../../utils/rand/kor/getWord";
import prisma from "../../utils/prisma";
import { randWordEng } from "../../utils/rand";

export async function POST(req: Req, res: Res) {
  let text = req.body.text;
  let maxUsage = req.body.usage;
  let isEng = req.body.isEng;
  let expire = req.body.expire;

  if (
    typeof text != "string" ||
    typeof maxUsage != "number" ||
    typeof isEng != "boolean" ||
    typeof expire != "number"
  )
    return res.send({
      s: false,
      e: "Invalid query",
    });

  try {
    const getID = () => {
      if (isEng) return randWordEng(6);
      return getWord();
    };
    let id = getID();
    while (true) {
      let thing = await prisma.textLink.findFirst({
        where: {
          from: lzw_encode(id),
        },
      });
      if (!thing) break;
      if (thing.expireAfter < new Date())
        await prisma.textLink.delete({
          where: {
            from: lzw_encode(id),
          },
        });
      id = getID();
    }

    await prisma.textLink.create({
      data: {
        from: lzw_encode(id),
        text: text,
        maxUsage: maxUsage,
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
