import express from "express";
import prisma from "./utils/prisma";
import { lzw_decode, lzw_encode } from "./utils/encode";
import getWord from "./rand/getWord";
import isbot from "isbot";

import "dotenv/config";

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

const botHandler = (req: any, res: any, link: string, ogTitle: string) => {
  console.log(req.get("user-agent"));
  if (isbot(req.get("user-agent"))) {
    res.send({
      s: false,
      e: "<meta>",
      meta: {
        url: `https://poi.kr${link}`,
        title: ogTitle,
        description: ogTitle,
      },
    });
    return true;
  } else {
    return false;
  }
};

app.get("/url/redirect/:link", async (req, res) => {
  try {
    const link = req.params.link;

    if (botHandler(req, res, `/${link}`, "Shorted link by someone / " + link))
      return;
    let to = await prisma.link.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to) return res.status(404).redirect("https://poi.kr/errors/link");
    if (to.expireOnce)
      await prisma.link.delete({
        where: {
          from: lzw_encode(link),
        },
      });
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
    if (
      botHandler(
        req,
        res,
        `/c/${link}`,
        "Customized path link by someone / " + link
      )
    )
      return;
    let to = await prisma.customLink.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to) return res.status(404).redirect("https://poi.kr/errors/custom");
    if (to.expireOnce)
      await prisma.customLink.delete({
        where: {
          from: lzw_encode(link),
        },
      });
    return res.status(301).redirect(lzw_decode(to.to));
  } catch (e) {
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
});

app.get("/text/data/:link", async (req, res) => {
  try {
    const link = req.params.link;
    if (botHandler(req, res, `/t/${link}`, "Shared text by someone / " + link))
      return;
    let to = await prisma.textLink.findFirst({
      where: {
        from: lzw_encode(link),
      },
    });
    if (!to) return res.status(404).redirect("https://poi.kr/errors/text");
    console.log(to);
    if (to.expireOnce)
      await prisma.textLink.delete({
        where: {
          from: lzw_encode(link),
        },
      });
    return res.send({
      s: true,
      e: lzw_decode(to.text),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      s: false,
      e: "Internal Server Error",
    });
  }
});

app.get("/text/raw/:link", async (req, res) => {
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
    if (to.expireOnce)
      prisma.textLink.delete({
        where: {
          from: lzw_encode(link),
        },
      });
    return res.send(lzw_decode(to.text));
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
  let expireOnce = req.body.expire;

  if (
    typeof to == "undefined" ||
    typeof isEng == "undefined" ||
    typeof expireOnce != "boolean"
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
      id = getID();
    }

    await prisma.link.create({
      data: {
        from: lzw_encode(id),
        to: lzw_encode(to),
        expireOnce: expireOnce,
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
    const expireOnce = req.body.expire;
    if (!to || !from || typeof expireOnce != "boolean")
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
        expireOnce: expireOnce,
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

app.post("/text/new", async (req, res) => {
  let text = req.body.text;
  let useOnce = req.body.useOnce;
  let isEng = req.body.isEng;

  if (
    typeof text != "string" ||
    typeof useOnce != "boolean" ||
    typeof isEng != "boolean"
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
      id = getID();
    }

    await prisma.textLink.create({
      data: {
        from: lzw_encode(id),
        text: lzw_encode(text),
        expireOnce: useOnce,
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

app.listen(3008, () => {
  console.log("Listening on port 3008");
});
