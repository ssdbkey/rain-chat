/* eslint-disable consistent-return */
import * as socketIo from "socket.io";

import { ServicesContext } from "../context";
import { authVerify } from "../middlewares/verify";
import { getUploadToken } from "../utils/qiniu";
import { getAllMessage, getGroupItem } from "./message.socket";
import { requestFrequency } from "../middlewares/requestFrequency";
import * as privateSockets from "./private.socket";
import * as groupSockets from "./group.socket";

let io: socketIo.Server;

function getSocketIdHandle(arr) {
  return arr[0] ? JSON.parse(JSON.stringify(arr[0])).socketid : "";
}

const getRoomClients = (room): Promise<any> => {
  return new Promise((resolve, reject) => {
    io.of("/").in(room).clients((error, clients) => {
      resolve(clients);
    });
  });
};

function emitAsync(socket, emitName, data, callback) {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.emit) {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject("pls input socket");
    }
    socket.emit(emitName, data, (...args) => {
      let response;
      if (typeof callback === "function") {
        response = callback(...args);
      }
      resolve(response);
    });
  });
}

const initServer = server => {
  const {
    userService,
    chatService,
    groupChatService,
    groupService,
  } = ServicesContext.getInstance();

  io = socketIo(server);
  io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (authVerify(token)) {
      console.log("verify socket token success", token);
      return next();
    }
    return next(new Error(`Authentication error! time =>${new Date().toLocaleString()}`));
  });

  io.on("connection", async socket => {
    const socketId = socket.id;
    let user_id;
    let clientHomePageList;
    console.log("connection socketId=>", socketId, "time=>", new Date().toLocaleString());

    // Get data for group chats and private chats
    await emitAsync(socket, "initSocket", socketId, (userId, homePageList) => {
      console.log("userId", userId);
      user_id = userId;
      clientHomePageList = homePageList;
    });
    const allMessage = await getAllMessage({ user_id, clientHomePageList });
    socket.emit("initSocketSuccess", allMessage);
    console.log("initSocketSuccess user_id=>", user_id, "time=>", new Date().toLocaleString());

    socket.use((packet, next) => {
      if (!requestFrequency(socketId)) return next();
      next(new Error("Access interface frequently, please try again in a minute!"));
    });

    // init socket
    const arr = await userService.getUserSocketId(user_id);
    const existSocketIdStr = getSocketIdHandle(arr);
    const newSocketIdStr = existSocketIdStr ? `${existSocketIdStr},${socketId}` : socketId;
    // await userService.saveUserSocketId(user_id, newSocketIdStr); // TOO LONG DB EXCEPTION in dev mode
    await userService.saveUserSocketId(user_id, socketId);
    console.log("initSocket user_id=>", user_id, "time=>", new Date().toLocaleString());

    // init GroupChat
    const result = await userService.getGroupList(user_id);
    const groupList = JSON.parse(JSON.stringify(result));
    for (const item of groupList) {
      socket.join(item.to_group_id);
    }
    console.log("initGroupChat user_id=>", user_id, "time=>", new Date().toLocaleString());

    socket
      // Private message
      .on("sendPrivateMsg", async (data, cbFn) => {
        await privateSockets.sendPrivateMsg(io, socket, data, cbFn);
      })
      .on("getOnePrivateChatMessages", async (data, fn) => {
        await privateSockets.getOnePrivateChatMessages(io, socket, data, fn);
      })
      .on("addAsTheContact", async (data, fn) => {
        privateSockets.addAsTheContact(io, socket, data, fn);
      })
      .on("getUserInfo", async (user_id, fn) => {
        await privateSockets.getUserInfo(io, socket, user_id, fn);
      })
      .on("deleteContact", async ({ from_user, to_user }, fn) => {
        await privateSockets.deleteContact(io, socket, { from_user, to_user }, fn);
      })

      // Group chat
      .on("sendGroupMsg", async (data, cbFn) => {
        await groupSockets.sendGroupMsg(io, socket, data, cbFn);
      })
      .on("getOneGroupMessages", async (data, fn) => {
        await groupSockets.getOneGroupMessages(io, socket, data, fn);
      })
      .on("getOneGroupItem", async (data, fn) => {
        await groupSockets.getOneGroupItem(io, socket, data, fn);
      })
      .on("createGroup", async (data, fn) => {
        await groupSockets.createGroup(io, socket, data, fn);
      })
      .on("updateGroupInfo", async (data, fn) => {
        await groupSockets.updateGroupInfo(io, socket, data, fn);
      })
      .on("joinGroup", async (data, fn) => {
        await groupSockets.joinGroup(io, socket, data, fn);
      })
      .on("leaveGroup", async data => {
        await groupSockets.leaveGroup(io, socket, data);
      })
      .on("getGroupMember", async (groupId, fn) => {
        await groupSockets.getGroupMember(io, socket, groupId, fn);
      });

    //  Fuzzy match users or groups
    socket.on("fuzzyMatch", async (data, fn) => {
      try {
        let fuzzyMatchResult;
        const field = `%${data.field}%`;
        if (data.searchUser) {
          fuzzyMatchResult = await userService.fuzzyMatchUsers(field);
        } else {
          fuzzyMatchResult = await groupService.fuzzyMatchGroups(field);
        }
        fn({ fuzzyMatchResult, searchUser: data.searchUser });
      } catch (error) {
        console.log("error", error.message);
        io.to(socketId).emit("error", { code: 500, message: error.message });
      }
    });

    // qiniu token
    socket.on("getQiniuToken", async (data, fn) => {
      try {
        const uploadToken = await getUploadToken();
        console.log("getQiniuToken data=>", data, "time=>", new Date().toLocaleString());
        return fn(uploadToken);
      } catch (error) {
        console.log("error", error.message);
        io.to(socketId).emit("error", { code: 500, message: error.message });
      }
    });

    socket.on("disconnect", async reason => {
      try {
        const arr = await userService.getUserSocketId(user_id);
        const existSocketIdStr = getSocketIdHandle(arr);
        const toUserSocketIds = (existSocketIdStr && existSocketIdStr.split(",")) || [];
        const index = toUserSocketIds.indexOf(socketId);

        if (index > -1) {
          toUserSocketIds.splice(index, 1);
        }

        await userService.saveUserSocketId(user_id, toUserSocketIds.join(","));

        // if (toUserSocketIds.length) {
        //   await userService.saveUserSocketId(_userId, toUserSocketIds.join(','));
        // } else {
        //   await Promise.all([
        //     userService.saveUserSocketId(_userId, toUserSocketIds.join(',')),
        //     userService.updateUserStatus(_userId, 0)
        //   ]);
        // }

        console.log(
          "disconnect.=>reason",
          reason,
          "user_id=>",
          user_id,
          "socket.id=>",
          socket.id,
          "time=>",
          new Date().toLocaleString(),
        );
      } catch (error) {
        console.log("error", error.message);
        io.to(socketId).emit("error", { code: 500, message: error.message });
      }
    });
  });
};

const broadcast = (emitName, data, onError) => {
  try {
    io.sockets.emit(emitName, data);
  } catch (error) {
    if (onError) {
      onError(error);
    }
  }
};

const emitTo = (to_socket_id, emitName, data, onError) => {
  try {
    io.to(to_socket_id).emit(emitName, data);
  } catch (error) {
    if (onError)
      onError(error);
  }
};

export const socketServer = {
  initServer,
  broadcast,
  emitTo,
  getSocketIdHandle,
  getRoomClients,
};