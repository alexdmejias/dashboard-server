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

  async deleteItem(type: SupportedDBCallbacks, id: string): Promise<void> {
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
