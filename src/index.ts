import express from "express";
import prisma from "./utils/prisma";
import { lzw_decode, lzw_encode } from "./utils/encode";
import getWord from "./rand/getWord";

const app = express();

// 1, 0, l, I, i는 안나옴.
const randWordEng = (len: number) => {
  let usables =
    "qwertyuopasdfghjkzxcvbnm23456789QWERTYUOPASDFGHJKLZXCVBNM".split("");
  let out = "";
  while (out.length < len)
    out += usables[Math.floor(Math.random() * usables.length)];
  return out;
};

app.use(express.json());

app.get("/url/redirect/:link", async (req, res) => {
  try {
    const link = req.params.link;
    let to = await prisma.link.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to) return res.status(404).redirect("https://poi.kr/errors/link");
    return res.status(301).redirect(lzw_decode(to.to));
  } catch (e) {
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
});

app.get("/custom/redirect/:link", async (req, res) => {
  try {
    const link = req.params.link;
    let to = await prisma.customLink.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to) return res.status(404).redirect("https://poi.kr/errors/custom");
    return res.status(301).redirect(lzw_decode(to.to));
  } catch (e) {
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
});

app.post("/url/new", async (req, res) => {
  let isEng = req.body.eng;
  let to = req.body.to;

  if (typeof to == "undefined" || typeof isEng == "undefined")
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
      id = getID();
    }

    await prisma.link.create({
      data: {
        from: lzw_encode(id),
        to: lzw_encode(to),
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
});

app.post("/custom/new", async (req, res) => {
  // 임시로 custom link에 저장 안함
  try {
    const to = req.body.to;
    const from = req.body.from;
    if (!to || !from)
      return res.send({
        s: false,
        e: "Invalid Query",
      });
    let x = await prisma.customLink.findFirst({
      where: {
        from: lzw_encode(from as string),
      },
    });
    if (x)
      return res.send({
        s: false,
        e: "Elready Exsists",
      });
    await prisma.customLink.create({
      data: {
        from: lzw_encode(from as string),
        to: lzw_encode(to as string),
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
});

app.listen(3008, () => {
  console.log("Listening on port 3008");
});
