import * as aws from "../utils/aws";
import { ServicesContext } from "../context";
import { socketServer } from "../socket/app.socket";
import { User } from "../models";

export const getProfileInfo = async (ctx, next) => {
  const { username } = ctx.params;
  const { userService } = ServicesContext.getInstance();

  const userInfo: User = await userService.findUserByUsername(username);
  if (userInfo === undefined) {
    ctx.body = {
      success: false,
      message: "Username does not exist."
    };
  } else {
    const { id, name, email, balance, intro, avatar, refcode } = userInfo;
    ctx.body = {
      success: true,
      userInfo: {
        name,
        email,
        username,
        userId: id,
        balance,
        intro,
        avatar,
        referral: refcode
      },
    };
  }
};

export const updateProfileInfo = async (ctx, next) => {
  try {
    const { username } = ctx.params;
    const avatar = ctx.request.files.avatar;
    const { name, intro } = ctx.request.body;
    const { userService } = ServicesContext.getInstance();

    const fileName = `avatar/avatar-${username}`;
    let avatarUrl: string;
    if (avatar !== undefined) {
      const { url } = await aws.uploadFile({
        fileName,
        filePath: avatar.path,
        fileType: avatar.type,
      });
      avatarUrl = url;
    } else {
      avatarUrl = undefined;
    }

    await userService.setUserInfo(username, { name, intro, avatar: avatarUrl });
    const userInfo = {
      username,
      avatar: avatarUrl,
      name,
      intro,
    };
    socketServer.broadcast("updateProfileInfo", { userInfo }, error => console.log(error.message));
    ctx.body = {
      success: true,
      message: "Profile updated successfully.",
      userInfo,
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

export const saveWalletAddress = async (ctx, next) => {
  try {
    const { username } = ctx.state.user;
    const { walletAddress } = ctx.request.body;
    const { userService } = ServicesContext.getInstance();

    // Save withdrawal addresses
    // await userService.setWalletAddress(username, walletAddress);
    const updatedUser: User = await userService.findUserByUsername(username);
    ctx.body = {
      success: true,
      message: "Success",
      userInfo: updatedUser
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};