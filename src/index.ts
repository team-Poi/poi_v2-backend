import express from "express";
import { lstatSync, readdirSync } from "fs";
import { join as p_join } from "path";
import { createServer as httpsServer } from "https";
import { createServer, createServer as httpServer } from "http";
import { Server } from "socket.io";
import { getClientIp } from "request-ip";
import "dotenv/config";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import fs from "fs";

const ROUTES = p_join(__dirname, "routes");

const app = express();
app.use(express.json());

const PORT = 3008;

function isDir(path: string) {
  try {
    var stat = lstatSync(path);
    return stat.isDirectory();
  } catch (e) {
    console.error(e);
    return false;
  }
}

function loadFile(path: string) {
  let webPath = path.replace(".js", "").replace("index", "");
  console.log("[API]", webPath);
  return new Promise<void>((resolve, reject) => {
    import(p_join(ROUTES, path)).then((module) => {
      if (module.USE) app.use(webPath, module.USE);
      if (module.GET) app.get(webPath, module.GET);
      if (module.POST) app.post(webPath, module.POST);
      if (module.DELETE) app.delete(webPath, module.DELETE);
      if (module.PUT) app.put(webPath, module.PUT);
      if (module.PATCH) app.patch(webPath, module.PATCH);
      resolve();
    });
  });
}

async function loopPath(path: string) {
  let dirs = readdirSync(p_join(ROUTES, path));
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (isDir(p_join(ROUTES, path, dir))) await loopPath(path + dir + "/");
    else await loadFile(p_join(path + dir));
  }
}

interface Peer {
  id: string;
  name: string;
}

function randomUsername() {
  return uniqueNamesGenerator({
    length: 2,
    separator: " ",
    dictionaries: [colors, animals],
    style: "capital",
  });
}

let connectionCount = 0;

async function main() {
  await loopPath("/");

  const options = {
    key: fs.readFileSync("/Users/oeinter/Documents/ssl/private.key"),
    cert: fs.readFileSync("/Users/oeinter/Documents/ssl/certificate.crt"),
  };

  let server = createServer(app);

  let io = new Server(server, {
    cors: {
      origin: process.env.CLIENT,
      methods: ["GET", "POST"],
    },
  });

  io.listen(server);

  io.on("connection", (socket) => {
    connectionCount++;
    const socketIP = getClientIp(socket.request);
    if (!socketIP) {
      socket.emit("system.disconnection", {
        message: "IP not found",
      });
      return socket.disconnect();
    }

    console.log(
      "New socket connection! Connection Count :",
      connectionCount,
      " ip adress : ",
      socketIP
    );

    const roomID = `room-${socketIP}`;
    const userInfo: Peer = {
      id: socket.id,
      name: randomUsername(),
    };

    socket.emit("local.user.info", userInfo);
    socket.data.user = userInfo;

    // Send to room that new user has been joined
    io.to(roomID).emit("local.user.connection", userInfo);

    // Join room
    io.in(roomID)
      .fetchSockets()
      .then((sockets) => {
        socket.emit(
          "local.room.users",
          sockets.map((socket) => socket.data.user)
        );

        socket.join(roomID);
      });

    // Send to room that this user has been disconnected
    socket.on("disconnect", () => {
      connectionCount--;
      console.log("Connection closed! Connection count :", connectionCount);
      io.to(roomID).emit("local.user.disconnection", userInfo);
    });

    // 받는놈이 파일받기 싫다고 전송 했을때
    socket.on("local.file.reject", (data) => {
      socket.to(data.id).emit("local.file.response.reject", {
        id: userInfo.id,
        uid: data.uid,
      });
    });

    // 받는놈이 파일 받고 싶다고 전송 했을때
    socket.on("local.file.request.accept", (data) => {
      socket.to(data.id).emit("local.file.response.accepted", {
        id: userInfo.id,
        uid: data.uid,
      });
    });

    // 파일 보내고 싶다고 요청
    socket.on("local.file.request", (data) => {
      io.to(data.id).emit("local.file.request", {
        ...data,
        id: userInfo.id,
        name: userInfo.name,
      });
    });

    // 보내는 놈이 WebRTC offer보냄
    socket.on("local.rtc.offer", (data) => {
      io.to(data.id).emit("local.file.offer", {
        id: userInfo.id,
        offer: data.offer,
        uid: data.uid,

        size: data.size,
        name: data.name,
      });
    });

    // 받는놈이 WebRTC answer를 보냄
    socket.on("local.rtc.answer", (data) => {
      io.to(data.id).emit("local.file.answer", {
        id: userInfo.id,
        answer: data.answer,
        uid: data.uid,
      });
    });

    // 파일 전송 스트림 끝내라고 전송
    socket.on("local.rtc.close", (data) => {
      io.to(data.id).emit("local.rtc.close", {
        id: userInfo.id,
        uid: data.uid,
      });
    });

    // Ice candidate
    socket.on("local.rtc.ice", (data) => {
      console.log("ICE", data);
      io.to(data.id).emit("local.rtc.ice", {
        id: userInfo.id,
        ice: data.ice,
        uid: data.uid,
      });
    });
  });

  server.listen(PORT, () => {
    console.log("Listening on port", PORT);
  });
}

main();
