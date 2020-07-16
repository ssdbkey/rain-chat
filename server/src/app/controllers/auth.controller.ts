import * as md5 from "md5";
import * as uniqid from "uniqid";
import * as moment from "moment";
import { generateToken, authVerify } from "../middlewares/verify";
import { ServicesContext } from "../context";
import { socketServer } from "../socket/app.socket";
import configs from "@configs";
import { User, Ban, Otp } from "../models";
import { isVitaePostEnabled, generateOtp, verifyOtp, sendMail } from "../utils";
import { rpcInterface } from "../utils/wallet/RpcInterface";

export const loginUser = async (ctx, next) => {
  try {
    const { userService, banService } = ServicesContext.getInstance();

    const { email = "", username = "", password = "" } = ctx.request.body;
    if ((username === "" && email === "") || password === "") {
      ctx.body = {
        success: false,
        message: "Username or password cannot be empty",
      };
      return;
    }
    const user: User = await userService.findUserByEmailOrUsername(email, username);
    if (user === undefined) {
      ctx.body = {
        success: false,
        message: "Invalid username or email",
      };
      return;
    }
    //   After the verification is successful, the server will issue a Token, and then send the Token to the client
    if (md5(password) !== user.password) {
      ctx.body = {
        success: false,
        message: "Wrong Password",
      };
      return;
    }
    const { id, username: userName, email: userEmail, name, balance, intro, avatar, refcode, role, ban } = user;
    const bans: Ban[] = await banService.getBanInfo(id, configs.rain.group_id, Ban.TYPE.GROUP);
    if (bans.length >= 3) {
      ctx.body = {
        success: false,
        message: "You are permanentaly banned."
      };
      return;
    }
    if (ban === User.BAN.BANNED) {
      const lastBanTime = bans[0].time;
      const paneltyDays = bans.length === 1 ? 1 : 3;
      if (lastBanTime <= moment().utc().subtract(paneltyDays, "day").unix()) {
        await userService.unbanUsersFromRainGroup([id]);
      }
    }
    const token = generateToken({ id, username });
    ctx.body = {
      success: true,
      message: "Login Successful",
      userInfo: {
        name,
        email: userEmail,
        username: userName,
        userId: id,
        balance,
        intro,
        avatar,
        referral: refcode,
        role,
        token,
        ban,
        isVitaePostEnabled: isVitaePostEnabled(user)
      },
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: "Login Failed!",
    };
  }
};

export const registerUser = async (ctx, next) => {
  try {
    const { name, email, username, password, sponsor } = ctx.request.body;
    const { userService, groupService } = ServicesContext.getInstance();

    if (username === "" || password === "" || name === "" || email === "") {
      ctx.body = {
        success: false,
        message: "Username or password cannot be empty",
      };
      return;
    }
    if (sponsor === "" || !sponsor) {
      ctx.body = {
        success: false,
        message: "Please provide the referral code",
      };
      return;
    }
    // Check Referral Username
    const sponsorUser: User = await userService.findUserByRefcode(sponsor);
    if (sponsorUser === undefined) {
      ctx.body = {
        success: false,
        message: "Referral username is invalid",
      };
      return;
    }
    const existingUser: User = await userService.findUserByEmailOrUsername(email, username);
    if (existingUser !== undefined) {
      ctx.body = {
        success: false,
        message: "Username or email already exists",
      };
      return;
    }
    // Register DB
    const walletAddress = await rpcInterface.getNewAddress();
    await userService.insertUser({
      name, email, username,
      password: md5(password),
      sponsorId: sponsorUser.id,
      refcode: uniqid(),
      walletAddress
    });
    // Join Rain Group & Broadcast
    const userInfo: User = await userService.getUserInfoByUsername(username);
    await groupService.joinGroup(userInfo.id, configs.rain.group_id);
    socketServer.broadcast("getGroupMsg", {
      ...userInfo,
      message: `${userInfo.name} joined a group chat`,
      groupId: configs.rain.group_id,
      tip: "joinGroup",
    }, error => console.log(error.message));

    ctx.body = {
      success: true,
      message: "Registration success!",
    };
    console.log("Registration success");
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: "Registration failed!",
    };
  }
};

export const validateToken = async (ctx, next) => {
  try {
    const { token } = ctx.request.body;

    const checkResult = authVerify(token);
    if (checkResult === false) {
      ctx.body = {
        success: false,
        message: "Invalid Token"
      };
      return;
    }

    const { username } = checkResult;
    const { userService } = ServicesContext.getInstance();
    const userInfo = await userService.getUserInfoByUsername(username);
    if (userInfo === undefined) {
      ctx.body = {
        success: false,
        message: "Invalid Username."
      };
      return;
    }
    ctx.body = {
      success: true,
      message: "Valid",
      userInfo,
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: "Invalid Username.",
    };
  }
};

export const generateOTP = async (ctx, next) => {
  try {
    const { username } = ctx.state.user;
    const { userService } = ServicesContext.getInstance();

    const user: User = await userService.findUserByUsername(username);
    if (user === undefined) {
      ctx.body = {
        success: false,
        message: "Invalid Username."
      };
      return;
    }
    const otp: string = await generateOtp(user.id, Otp.TYPE.WITHDRAW);
    sendMail({
      to: user.email,
      subject: "Vitae OTP",
      text: otp,
      html: undefined,
    });
    ctx.body = {
      success: true,
      message: "6 digit code sent to your email.",
      expireIn: configs.otp.timeOut
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: "Invalid Username.",
    };
  }
};

export const verifyOTP = async (ctx, next) => {
  try {
    const { username } = ctx.state.user;
    const { token } = ctx.request.body;
    const { userService } = ServicesContext.getInstance();

    const user: User = await userService.findUserByUsername(username);
    if (user === undefined) {
      ctx.body = {
        success: false,
        message: "Invalid Username."
      };
      return;
    }

    const isValid: boolean = await verifyOtp(user.id, Otp.TYPE.WITHDRAW, token);
    ctx.body = {
      success: true,
      message: isValid ? "Verified" : "Token invalid or expired",
      isValid,
    };
  } catch (error) {
    console.log(error.message);
    ctx.body = {
      success: false,
      message: "Invalid Username.",
    };
  }
};