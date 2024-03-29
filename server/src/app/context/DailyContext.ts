import * as moment from "moment";
import { CronJob } from "cron";
import { ServicesContext } from "@context";
import { User, Ban } from "@models";

const RAIN_GROUP_ID = process.env.RAIN_GROUP_ID;

export class DailyContext {
  static instance: DailyContext;
  static membershipJob: CronJob;

  static getInstance(): DailyContext {
    if (!DailyContext.instance) {
      DailyContext.instance = new DailyContext();
    }
    return DailyContext.instance;
  }

  constructor() {
    // * * * * * *
    // | | | | | |
    // | | | | | day of week
    // | | | | month
    // | | | day of month
    // | | hour
    // | minute
    // second ( optional )
    DailyContext.membershipJob = new CronJob("0 0 * * *", async () => {
      console.log("Daily Check => Checking Membership Expire, Rain Group Ban");
      await this.checkMembership();
      await this.checkRainGroupBan();
    }, undefined, true, "UTC");
  }

  async checkMembership() {
    try {
      const { userService } = ServicesContext.getInstance();
      const expireTime = moment().utc().subtract(1, "months").unix();
      const expiredUsers: User[] = await userService.getUsersByExpired(User.ROLE.UPGRADED_USER, expireTime);
      await userService.resetExpiredRole(User.ROLE.UPGRADED_USER, expireTime);
      console.log(`Membership Expiration => ${expiredUsers.length} users' membership have been expired`);
    } catch (error) {
      console.log("Membership Expiration => Error:", error.message);
    }
  }

  async checkRainGroupBan() {
    try {
      const { userService, banService } = ServicesContext.getInstance();
      const bannedUsers = await userService.getUsersByRainBanned();
      if (bannedUsers.length === 0) return;
      const banNumbers: number[] = await Promise.all<number>(bannedUsers.map(user => {
        return banService.numberOfBan(user.id, RAIN_GROUP_ID, Ban.TYPE.GROUP);
      }));

      // Filter Users to restore
      const lastDay = moment().utc().subtract(1, "day").unix();
      const userIdsToRestore: number[] = [];
      bannedUsers.forEach((user, i) => {
        if (banNumbers[i] < 3 && user.time >= lastDay) {
          userIdsToRestore.push(user.id);
        }
      });

      // Restore banned users
      console.log(`Unban Users => Unban ${userIdsToRestore.length} users from Rain Room`);
      await userService.unbanUsersFromRainGroup(userIdsToRestore);
    } catch (error) {
      console.log("Unban Users => Error:", error.message);
    }
  }
}