import * as socketIo from "socket.io";
import { requestFrequency, authVerify } from "../../app/middlewares/index";
import { socketEventNames, Channels } from "./resource.socket";
import { User } from "../../app/models/index";

let io: socketIo.Server;
let serverSocket: socketIo.Socket;

const initServer = server => {
  io = socketIo(server, {
    pingTimeout: 18000000,
    pingInterval: 25000
  });

  io.use((socket, next) => {
    const token = socket.handshake.query.token;
    console.log(token);
    if (token === "rain-chat-server") {
      socket.request.type = "server";
      serverSocket = socket;
      console.log("Socket => Server socket connected");
      return next();
    }
    const result = authVerify(token);
    if (result) {
      console.log("Socket => Verify socket token | success");
      socket.request.type = "client";
      socket.request.id = result.id;
      socket.request.username = result.username;
      return next();
    }
    return next(new Error(`Socket => Authentication error`));
  });

  io.on("connection", async socket => {

    // Server Communication
    if (socket.request.type === "server") {
      socket
        .on("broadcast", ({ emitName, data }) => {
          io.emit(emitName, data);
        })
        .on("broadcastChannel", ({ channelName, emitName, data }) => {
          io.to(channelName).emit(emitName, data);
        })
        .on("emitTo", ({ toSocketIds, emitName, data }) => {
          const socketids = toSocketIds.split(",");
          socketids.forEach(socketid => {
            if (socketid !== "" && socketid !== undefined)
              io.to(socketid).emit(emitName, data);
          });
        })
        .on("allSocketCount", (cbFn) => {
          const count = Object.keys(io.sockets.sockets).length;
          cbFn(count);
        });
    }
    // Client Communication
    if (socket.request.type === "client") {
      const socketId = socket.id;
      console.log("Socket => Connection | socketId:", socketId);

      // Get data for group chats and private chats
      const { userId, clientHomePageList } = await emitAsync(socket, socketEventNames.InitSocket, socketId);
      const allMessage = await emitAsync(serverSocket, "initSocket", { socketId, userId, clientHomePageList });
      socket.emit(socketEventNames.InitSocketSuccess, allMessage);
      for (const item of allMessage.groupList) {
        socket.join(item.groupId);
      }
      console.log(`Socket => InitSocketSuccess | userId:${userId}`);

      // Join Role Channels
      const role = allMessage.userInfo.role;
      if (role === User.ROLE.OWNER)
        socket.join(Channels.OwnerChannel);
      if (role === User.ROLE.MODERATOR)
        socket.join(Channels.ModerChannel);
      console.log(`Socket => InitGroupChat | userId:${userId}`);

      socket.use((packet, next) => {
        if (!requestFrequency(socketId)) return next();
        next(new Error("Access interface frequently, please try again in a minute!"));
      });

      socket
        // Private message
        .on("sendPrivateMsg", async (data, cbFn) => {
          serverSocket.emit("sendPrivateMsg", { ...data, userId }, cbFn);
        })
        .on("getOnePrivateChatMessages", async (data, cbFn) => {
          serverSocket.emit("getOnePrivateChatMessages", { ...data, userId }, cbFn);
        })
        .on("addAsTheContact", async (data, cbFn) => {
          serverSocket.emit("addAsTheContact", { ...data, userId }, cbFn);
        })
        .on("getUserInfo", async (userID, cbFn) => {
          serverSocket.emit("getUserInfo", userID, cbFn);
        })
        .on("deleteContact", async (data, cbFn) => {
          serverSocket.emit("deleteContact", { ...data, userId }, cbFn);
        })

        // Group Message
        .on("sendGroupMsg", async (data, cbFn) => {
          serverSocket.emit("sendGroupMsg", { ...data, userId }, cbFn);
        })
        .on("getOneGroupMessages", async (data, cbFn) => {
          serverSocket.emit("getOneGroupMessages", { ...data, userId }, cbFn);
        })
        .on("getOneGroupItem", async (data, cbFn) => {
          serverSocket.emit("getOneGroupItem", { ...data, userId }, cbFn);
        })
        .on("createGroup", async (data, cbFn) => {
          serverSocket.emit("createGroup", { ...data, userId, socket }, response => {
            socket.join(data.groupId);
            cbFn(response);
          });
        })
        .on("updateGroupInfo", async (data, cbFn) => {
          serverSocket.emit("updateGroupInfo", { ...data, userId }, cbFn);
        })
        .on("joinGroup", async (data, cbFn) => {
          serverSocket.emit("joinGroup", { ...data, userId }, response => {
            socket.join(data.groupId);
            cbFn(response);
          });
        })
        .on("leaveGroup", async data => {
          socket.leave(data.groupId);
          serverSocket.emit("leaveGroup", { ...data, userId });
        })
        .on("kickMember", async (data, cbFn) => {
          serverSocket.emit("kickMember", { ...data, userId }, cbFn);
        })
        .on("getGroupMember", async (groupId, cbFn) => {
          io.in(groupId).clients((err, onlineSockets) => {
            serverSocket.emit("getGroupMember", { groupId, onlineSockets }, cbFn);
          });
        })
        .on("banMember", async (data, cbFn) => {
          serverSocket.emit("banMember", { ...data, userId }, cbFn);
        })
        .on("findMatch", async (data, cbFn) => {
          serverSocket.emit("findMatch", data, cbFn);
        })
        .on("subscribeAdsReward", async (data) => {
          serverSocket.emit("subscribeAdsReward", data);
        })

        .on("disconnect", async reason => {
          console.log(`Socket => Disconnect | reason:${reason} userId:${userId}, socketId:${socket.id}`);
          serverSocket.emit("disconnected", { reason, userId, socketId });
        });
    }
  });
};

const emitAsync = (socket: socketIo.Socket, emitName, data): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      socket.emit(emitName, data, response => {
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const socketServer = {
  initServer,
};