export type GoalStatus = 'active' | 'completed' | 'paused';
export type DebtStatus = 'active' | 'paid' | 'paused';
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';
export type ContributionFrequency = PaymentFrequency | 'quarterly' | 'yearly';
export type SavingsGoalCategory = 'Emergency Fund' | 'Vacation' | 'Home' | 'Vehicle' | 'Education' | 'Other';
export type DebtType = 'Credit Card' | 'Personal Loan' | 'Auto Loan' | 'Student Loan' | 'Mortgage' | 'Other';

export interface Product2Account { id:string; displayName:string; currency:string; createdAt:string; updatedAt:string; }
export interface Product2Settings { accountId:string; currency:string; dateFormat:string; interestConvention:'nominal-annual'; paymentTiming:'end-of-period'; minimumPaymentPolicy:'configured-minimum'; calculationPreferences:{decimalPlaces:number}; }
export interface SavingsGoal { id:string; accountId:string; name:string; category:SavingsGoalCategory; targetAmount:number; openingBalance:number; targetDate?:string; contributionFrequency?:ContributionFrequency; plannedContribution?:number; status:GoalStatus; notes?:string; }
export interface SavingsContribution { id:string; accountId:string; goalId:string; date:string; amount:number; source?:string; note?:string; }
export interface DebtAccount { id:string; accountId:string; creditor:string; type:DebtType; openingBalance:number; balance:number; interestRate?:number; minimumPayment:number; paymentFrequency:PaymentFrequency; fees?:number; status:DebtStatus; notes?:string; }
export interface DebtPayment { id:string; accountId:string; debtId:string; date:string; amount:number; principal?:number; interest?:number; fees?:number; note?:string; }
export interface Product2Workbook { account:Product2Account; settings:Product2Settings; savingsGoals:SavingsGoal[]; savingsContributions:SavingsContribution[]; debts:DebtAccount[]; debtPayments:DebtPayment[]; }
export interface RepaymentStep { month:number; debtId:string; startingBalance:number; interest:number; payment:number; endingBalance:number; }
export interface DebtProjection { debtId:string; payoffMonth:number|null; totalInterest:number; totalPayments:number; steps:RepaymentStep[]; }
export interface RepaymentScenario { strategy:'minimum'|'snowball'|'avalanche'; payoffMonth:number|null; totalInterest:number; totalPayments:number; order:string[]; projections:DebtProjection[]; }
