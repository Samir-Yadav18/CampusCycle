import { supabase } from "@/lib/supabaseClient";
import { 
  getStudentWallet, 
  topUpWalletAtomic, 
  debitRentalAtomic,
  TopUpResult,
  DebitResult 
} from "@/lib/walletStore";

export class WalletController {
  /**
   * Get student wallet
   */
  static getWallet(studentId: string = "IITB-22B0814") {
    return getStudentWallet(studentId);
  }

  /**
   * Top-up student wallet
   */
  static async topUp(
    studentId: string = "IITB-22B0814",
    amount: number,
    idempotencyKey: string = `TOPUP-${Date.now()}`,
    paymentMethod: "UPI" | "CARD" = "UPI"
  ): Promise<TopUpResult> {
    const res: TopUpResult = await topUpWalletAtomic({
      studentId,
      amount,
      paymentMethod,
      idempotencyKey,
    });

    if (res.success && res.transaction) {
      try {
        await supabase.from("wallet_transactions").insert([
          {
            id: res.transaction.id,
            wallet_id: `WLT-${studentId}`,
            amount: res.transaction.amount,
            type: res.transaction.type,
            category: res.transaction.category,
            idempotency_key: idempotencyKey,
            is_sandbox: true,
            timestamp: res.transaction.createdAt,
          },
        ]);
      } catch (e) {}
    }

    return res;
  }

  /**
   * Debit rental fare from student wallet
   */
  static async debitRental(
    studentId: string = "IITB-22B0814",
    amount: number,
    rideId: string,
    idempotencyKey: string = `DEBIT-${rideId}`,
    bookedDurationHours?: number
  ): Promise<DebitResult> {
    const res: DebitResult = await debitRentalAtomic({
      studentId,
      amount,
      rideId,
      idempotencyKey,
      description: `CampusCycle rental fare (${bookedDurationHours || 1} hrs @ ₹25/hr)`,
      bookedDurationHours,
    });

    if (res.success && res.transaction) {
      try {
        await supabase.from("wallet_transactions").insert([
          {
            id: res.transaction.id,
            wallet_id: `WLT-${studentId}`,
            amount: res.transaction.amount,
            type: res.transaction.type,
            category: res.transaction.category,
            reference_id: rideId,
            is_sandbox: true,
            timestamp: res.transaction.createdAt,
          },
        ]);
      } catch (e) {}
    }

    return res;
  }
}
