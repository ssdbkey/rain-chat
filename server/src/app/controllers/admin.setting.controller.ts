import { ServicesContext } from "@context";
import { User, Setting } from "@models";
import { isOwner } from "@utils";

export const getPlatformSettings = async (ctx, next) => {
  try {
    const { username } = ctx.state.user;
    const checkRole = await isOwner(username);
    if (checkRole.success === false) {
      ctx.body = checkRole;
      return;
    }

    const { settingService } = ServicesContext.getInstance();
    const settings = await settingService.getAllSettings();

    const setting = {};
    settings.forEach(element => setting[element.key] = element.value);

    ctx.body = {
      success: true,
      settings: setting,
    };
  } catch (error) {
    console.log("Admin Setting => Failed | Error:", error.message);
    ctx.body = {
      success: false,
      message: "Failed. Something went wrong."
    };
  }
};