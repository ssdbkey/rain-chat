import { query } from "../utils/db";
import * as moment from "moment";
import { DefaultModel, Expense } from "../models";

export class ExpenseService {
  readonly TABLE_NAME = "expense_info";
  readonly COL = {
    id: "id",
    userId: "userId",
    docPath: "docPath",
    amount: "amount",
    confirmCount: "confirmCount",
    rejectCount: "rejectCount",
    requestTime: "requestTime",
    confirmTime: "confirmTime",
    confirmer: "confirmer",
    rejector: "rejector",
    status: "status",
  };

  async createExpenseRequest(userId: number, docPath: string, amount: number): Promise<DefaultModel> {
    const sql = `
      INSERT INTO ${this.TABLE_NAME}(
        ${this.COL.userId},
        ${this.COL.docPath},
        ${this.COL.amount},
        ${this.COL.confirmer},
        ${this.COL.requestTime}
      ) VALUES (?,?,?,?);`;
    const result = await query(sql, [userId, docPath, amount, userId, moment().utc().unix()]);
    return result;
  }

  async getAllExpenses(): Promise<Expense[]> {
    const sql = `SELECT * FROM ${this.TABLE_NAME};`;
    const expenses: Expense[] = await query(sql);
    return expenses;
  }

  async getExpenseById(expId: number): Promise<Expense> {
    const sql = `SELECT * FROM ${this.TABLE_NAME} WHERE ${this.COL.id} = ?;`;
    const expenses: Expense[] = await query(sql, expId);
    if (expenses.length === 0) return undefined;
    return expenses[0];
  }

  async getExpensesByUserId(userId: number): Promise<Expense[]> {
    const sql = `SELECT * FROM ${this.TABLE_NAME} WHERE ${this.COL.userId} = ?;`;
    const expenses: Expense[] = await query(sql, userId);
    return expenses;
  }

  async updateConfirmCount(expId: number, userId: number): Promise<DefaultModel> {
    const existingExpense = await this.getExpenseById(expId);
    const confirmerIds = existingExpense.confirmer.split(",");
    // Already confirmed
    if (confirmerIds.includes(userId.toString())) return undefined;

    confirmerIds.push(userId.toString());
    const newConfirmer = confirmerIds.join(",");
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET
        ${this.COL.confirmCount} = ?,
        ${this.COL.confirmer} = ?
      WHERE ${this.COL.id} = ?;`;
    const result = await query(sql, [confirmerIds.length, newConfirmer, expId]);
    return result;
  }

  async updateRejectCount(expId: number, userId: number): Promise<DefaultModel> {
    const existingExpense = await this.getExpenseById(expId);
    const rejectorIds = existingExpense.rejector.split(",");
    // Already rejected
    if (rejectorIds.includes(userId.toString())) return undefined;

    rejectorIds.push(userId.toString());
    const newRejector = rejectorIds.join(",");
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET
        ${this.COL.rejectCount} = ?,
        ${this.COL.rejector} = ?
      WHERE ${this.COL.id} = ?;`;
    const result = await query(sql, [rejectorIds.length, newRejector, expId]);
    return result;
  }
}