import { Database } from "sqlite3";
import { SupportedDBCallbacks } from "./types";

class DB {
  db: Database;

  constructor() {
    this.db = new Database("db.sqlite");
  }

  async getRecord<T>(type: SupportedDBCallbacks): Promise<T> {
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
}

const db = new DB();

export default db;
