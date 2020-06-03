import { createPool } from "mysql";
import configs from "@configs";

const pool = createPool({ ...configs.dbConnection, multipleStatements: true });

export const query = (sql, values?): Promise<any> =>
  new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.log("query connec error!", err);
        // resolve(err);
      } else {
        connection.query(sql, values, (err, rows) => {
          if (err) {
            console.error("QUERY ERROR:", err.message);
            console.log(sql);
            reject(err);
          } else {
            resolve(rows);
          }
          connection.release();
        });
      }
    });
  });
