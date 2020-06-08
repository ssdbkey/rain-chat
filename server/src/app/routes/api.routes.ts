import * as Router from "koa-router";
import * as APIController from "../controllers";

export const apiRoutes = new Router()
  // Authentication
  .post("/register", APIController.registerController)
  .post("/login", APIController.loginController)

  // Referral
  .post("/ref/generate", APIController.generateReferral)
  .post("/ref/validate", APIController.validateReferral)

  // Profile
  .get("/user/:username", APIController.getProfileInfo)
  .put("/user/:username", APIController.updateProfileInfo)

  // Ads
  .post("/campaign/pub/create", APIController.registerAds)
  .get("/campaign/pub/all", APIController.getAdsByUsername)
  .get("/campaign/pub/:adsId", APIController.getAds)
  .put("/campaign/pub/:adsId", APIController.updateAds)
  .delete("/campaign/pub/:adsId", APIController.deleteAds)
  .post("/campaign/pub/:adsId/request", APIController.requestAds)
  .post("/campaign/pub/:adsId/cancel", APIController.cancelAds)

  .get("/campaign/mod/all", APIController.getAllAds)
  .post("/campaign/mod/:adsId/reject", APIController.rejectAds)
  .post("/campaign/mod/:adsId/approve", APIController.approveAds);