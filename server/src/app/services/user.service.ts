import { query } from "../utils/db";

export class UserService {
  // Fuzzy matching users
  fuzzyMatchUsers(link) {
    const _sql = `
    SELECT * FROM user_info WHERE name LIKE ?;
  `;
    return query(_sql, link);
  }

  // Register User
  insertData(value) {
    const _sql = "insert into user_info(name,password) values(?,?);";
    return query(_sql, value);
  }

  // Add github user
  insertGithubData({ name, github_id, avatar, location, website, github, intro, company }) {
    const _sql =
      "insert into user_info(name, github_id, avatar, location, website, github, intro, company) values(?,?,?,?,?,?,?,?);";
    return query(_sql, [name, github_id, avatar, location, website, github, intro, company]);
  }

  // Find github user information through github_id
  findGithubUser(githubId) {
    const _sql = "SELECT * FROM user_info WHERE github_id = ? ;";
    return query(_sql, githubId);
  }

  // Update github user information
  updateGithubUser({ name, avatar, location, website, github, intro, github_id, company }) {
    const _sql =
      " UPDATE  user_info SET name = ?,avatar = ?,location = ?,website = ?,github = ?,intro= ?, company = ? WHERE github_id = ? ; ";
    return query(_sql, [name, avatar, location, website, github, intro, company, github_id]);
  }

  // Find non-github user information by user name user_info
  findDataByName(name) {
    const _sql = "SELECT * FROM user_info WHERE name = ? and github_id IS NULL;";
    return query(_sql, name);
  }

  // Find user information by user id user_info includes user name, gender, avatar, last login time, status, etc. excluding password
  getUserInfo(user_id) {
    const _sql =
      "SELECT id AS user_id, name, avatar, location, website, github, github_id, intro, company  FROM user_info   WHERE  user_info.id =? ";
    return query(_sql, [user_id]);
  }

  // Check if the user id is a friend of the local user by checking the user id. If yes, return user_id and remark.
  isFriend(user_id, from_user) {
    const _sql =
      "SELECT  * FROM user_user_relation  AS u WHERE  u.user_id = ? AND u.from_user = ? ";
    return query(_sql, [user_id, from_user]);
  }

  // Add each other as friends
  addFriendEachOther(user_id, from_user, time) {
    const _sql = "INSERT INTO user_user_relation(user_id,from_user,time) VALUES (?,?,?), (?,?,?)";
    return query(_sql, [user_id, from_user, time, from_user, user_id, time]);
  }

  // Delete contact
  deleteContact(user_id, from_user) {
    const _sql =
      "DELETE FROM  user_user_relation WHERE (user_id = ? AND from_user = ?) or (user_id = ? AND from_user = ?)";
    return query(_sql, [user_id, from_user, from_user, user_id]);
  }

  // Find home page group list by user_id
  // TODO: Optimize SQL statement
  getGroupList(user_id) {
    const _sql = `SELECT r.to_group_id ,i.name , i.create_time,
      (SELECT g.message  FROM group_msg AS g  WHERE g.to_group_id = r.to_group_id  ORDER BY TIME DESC   LIMIT 1 )  AS message ,
      (SELECT g.time  FROM group_msg AS g  WHERE g.to_group_id = r.to_group_id  ORDER BY TIME DESC   LIMIT 1 )  AS time,
      (SELECT g.attachments FROM group_msg AS g  WHERE g.to_group_id = r.to_group_id  ORDER BY TIME DESC   LIMIT 1 )  AS attachments
      FROM  group_user_relation AS r inner join group_info AS i on r.to_group_id = i.to_group_id WHERE r.user_id = ? ;`;
    return query(_sql, user_id);
  }

  // Find homepage private chat list by user_id
  // TODO: Optimize SQL statement
  getPrivateList(user_id) {
    const _sql = ` SELECT r.from_user as user_id, i.name, i.avatar, i.github_id, r.time as be_friend_time,
      (SELECT p.message FROM private_msg AS p WHERE (p.to_user = r.from_user and p.from_user = r.user_id) or (p.from_user = r.from_user and p.to_user = r.user_id) ORDER BY p.time DESC   LIMIT 1 )  AS message ,
      (SELECT p.time FROM private_msg AS p WHERE (p.to_user = r.from_user and p.from_user = r.user_id) or (p.from_user = r.from_user and p.to_user = r.user_id) ORDER BY p.time DESC   LIMIT 1 )  AS time,
      (SELECT p.attachments FROM private_msg AS p WHERE (p.to_user = r.from_user and p.from_user = r.user_id) or (p.from_user = r.from_user and p.to_user = r.user_id) ORDER BY p.time DESC   LIMIT 1 )  AS attachments
      FROM  user_user_relation AS r inner join user_info AS i on r.from_user  = i.id WHERE r.user_id = ? ;`;
    return query(_sql, user_id);
  }

  saveUserSocketId(user_id, socketId) {
    const data = [socketId, user_id];
    const _sql = " UPDATE  user_info SET socketid = ? WHERE id= ? limit 1 ; ";
    return query(_sql, data);
  }

  getUserSocketId(toUserId) {
    const _sql = " SELECT socketid FROM user_info WHERE id=? limit 1 ;";
    return query(_sql, [toUserId]);
  }

  // Add as a friend unilaterally (may later add the function of turning on friend verification)
  // const addAsFriend = (user_id, from_user, time) {
  //   const _sql = 'INSERT INTO user_user_relation(user_id,from_user,time) VALUES (?,?,?)';
  //   return query(_sql, [user_id, from_user, time]);
  // };

  // Block friends
  // const shieldFriend = (status, user_id, from_user) {
  //   const _sql = 'UPDATE  user_user_relation  SET shield = ?  WHERE  user_id = ? AND from_user = ? ';
  //   return query(_sql, [status, user_id, from_user]);
  // };

  // // Modify notes
  // const editorRemark = (remark, user_id, from_user) {
  //   const _sql = 'UPDATE  user_user_relation  SET remark = ?  WHERE  user_id = ? AND from_user = ? ';
  //   return query(_sql, [remark, user_id, from_user]);
  // };

  // Find user information by user name user_info does not include password
  // const findUIByName = (name) {
  //   const _sql = 'SELECT id ,name ,sex,avatar,location,github FROM user_info WHERE name = ? ';
  //   return query(_sql, name);
  // };

  // Edit my information
  // const editorInfo = (data) {
  //   const _sql = ' UPDATE  user_info SET github = ?,website = ?,sex = ?,location = ? WHERE id = ? ; ';
  //   return query(_sql, data);
  // };

  // Find user information by user id user_info including password
  // const findDataByUserid = (user_id) {
  //   const _sql = 'SELECT * FROM user_info WHERE id= ? ';
  //   return query(_sql, [userid]);
  // };
}
