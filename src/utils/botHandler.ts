import isbot from "isbot";

export const botHandler = (
  req: any,
  res: any,
  link: string,
  ogTitle: string,
  sendDataAsJSON?: boolean
) => {
  if (isbot(req.get("user-agent"))) {
    if (sendDataAsJSON)
      res.send({
        s: false,
        e: "<meta>",
        meta: {
          url: `https://poi.kr${link}`,
          title: ogTitle,
          description: ogTitle,
        },
      });
    else
      res.send(
        `<!DOCTYPE html><html><head><meta property="og:type" content="website" /><meta property="og:url" content="https://poi.kr${link}" /><meta property="og:title" content="${ogTitle}" /><meta property="og:description" content="${ogTitle}" /><meta property="og:site_name" content="poi.kr (포이)" /><meta property="og:locale" content="en_US" /></head><body>No body for bots!</body></html>`
      );
    return true;
  } else {
    return false;
  }
};
