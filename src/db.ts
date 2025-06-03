import { Database } from "sqlite3";
import logger from "./logger";

class DB {
  db: Database;

  constructor() {
    this.db = new Database("db.sqlite");
  }

  runMigration(script: string) {
    return new Promise((resolve, reject) => {
      this.db.run(script, (error: Error) => {
        if (error) {
          logger.error("failed to run migration");
          reject(error);
        }

        return resolve(true);
      });
    });
  }

  async getRecord<T>(type: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.db.get<T>(
        `SELECT * FROM ${type} order by RANDOM() LIMIT 1`,
        (err, row) => {
          if (err) reject(err);

          return resolve(row);
        }
      );
    });
  }

  async deleteItem(type: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM ${type} WHERE id = ${id}`, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

const db = new DB();

export default db;
