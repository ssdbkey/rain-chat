export class Transaction {
  public id: number;
  public userId: number;
  public transactionId: string;
  public type: number;
  public status: number;
  public paidAmount: number;
  public expectAmount: number;
  public confirmTime: number;
  public time: number;
  public details: string;

  public static readonly STATUS = {
    EXPIRED: -1,
    REQUESTED: 0,
    PENDING_CONFIRM: 1,
    INSUFFICIENT_BALANCE: 2,
    INSUFFICIENT_REQUEST: 4,
    CONFIRMED: 3
  };

  public static readonly TYPE = {
    UNKNOWN: -1,
    ADS: 0,
    MEMBERSHIP: 1,
    VITAE_RAIN: 2, // Send-Vitae Purchase
    WITHDRAW: 3,
    STOCKPILE_RAIN: 4,
  };
}