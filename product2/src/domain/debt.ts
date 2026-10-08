import type { DebtAccount, DebtProjection, RepaymentScenario, RepaymentStep } from './types.js';

const round = (n:number) => Math.round(n * 100) / 100;
const paymentPeriodsPerYear = (frequency:DebtAccount['paymentFrequency']) =>
  frequency === 'weekly' ? 52 : frequency === 'biweekly' ? 26 : 12;

export function periodicRate(debt:DebtAccount):number {
  if (debt.interestRate == null) return 0;
  return Math.max(0, debt.interestRate) / 100 / paymentPeriodsPerYear(debt.paymentFrequency);
}

function applyPayment(balance:number, payment:number, rate:number) {
  const interest = round(balance * rate);
  const applied = Math.min(Math.max(0, payment), round(balance + interest));
  return { interest, payment:applied, endingBalance:round(Math.max(0, balance + interest - applied)) };
}

export function calculatePaymentAllocation(debt:DebtAccount, requestedPayment:number) {
  const balance=Math.max(0,debt.balance);
  const interest=round(balance*periodicRate(debt));
  const fees=round(Math.min(Math.max(0,debt.fees??0),Math.max(0,requestedPayment-interest)));
  const total=round(Math.min(Math.max(0,requestedPayment),balance+interest+fees));
  const principal=round(Math.max(0,total-interest-fees));
  return {interest,principal,fees,total};
}

export function projectMinimumPayment(debt:DebtAccount):DebtProjection {
  return projectSingleDebt(debt,debt.minimumPayment);
}

function projectSingleDebt(debt:DebtAccount,payment:number,monthLimit=1200):DebtProjection {
  let balance=Math.max(0,debt.balance); const steps:RepaymentStep[]=[]; let totalInterest=0,totalPayments=0;
  if(balance===0)return {debtId:debt.id,payoffMonth:0,totalInterest:0,totalPayments:0,steps:[]};
  if(payment<=0)return {debtId:debt.id,payoffMonth:null,totalInterest:0,totalPayments:0,steps:[]};
  for(let month=1;month<=monthLimit&&balance>0;month++){
    const r=applyPayment(balance,payment,periodicRate(debt));
    totalInterest+=r.interest; totalPayments+=r.payment;
    steps.push({month,debtId:debt.id,startingBalance:balance,interest:r.interest,payment:r.payment,endingBalance:r.endingBalance});
    balance=r.endingBalance;
  }
  return {debtId:debt.id,payoffMonth:balance===0?steps.length:null,totalInterest:round(totalInterest),totalPayments:round(totalPayments),steps};
}

export function projectRepaymentScenario(debts:DebtAccount[],strategy:RepaymentScenario['strategy'],extraMonthlyPayment=0):RepaymentScenario {
  const active=debts.filter(d=>d.balance>0);
  if(!active.length)return {strategy,payoffMonth:0,totalInterest:0,totalPayments:0,order:[],projections:[]};
  const remaining=new Map(active.map(d=>[d.id,Math.max(0,d.balance)]));
  const original=new Map(active.map(d=>[d.id,d]));
  const steps=new Map<string,RepaymentStep[]>(); const order:string[]=[];
  let totalInterest=0,totalPayments=0,month=0;
  const extra=Math.max(0,extraMonthlyPayment);
  while(remaining.size&&month<1200){
    month++;
    for(const [id,balance] of [...remaining.entries()]){
      const debt=original.get(id)!;
      const interest=round(balance*periodicRate(debt));
      const minimum=Math.min(Math.max(0,debt.minimumPayment),round(balance+interest));
      const end=round(Math.max(0,balance+interest-minimum));
      const list=steps.get(id)??[];
      list.push({month,debtId:id,startingBalance:balance,interest,payment:minimum,endingBalance:end});
      steps.set(id,list); totalInterest+=interest; totalPayments+=minimum; remaining.set(id,end);
      if(end===0){remaining.delete(id); if(!order.includes(id))order.push(id);}
    }
    if(!remaining.size)break;
    const candidates=[...remaining.keys()].map(id=>original.get(id)!);
    candidates.sort((a,b)=>strategy==='avalanche'
      ? (b.interestRate??0)-(a.interestRate??0)||a.id.localeCompare(b.id)
      : remaining.get(a.id)!-remaining.get(b.id)!||a.id.localeCompare(b.id));
    if(strategy!=='minimum'&&extra>0){
      let budget=extra;
      while(budget>0.009&&remaining.size){
        const target=candidates.find(d=>remaining.has(d.id));
        if(!target)break;
        const id=target.id;
        const current=remaining.get(id)!;
        const applied=Math.min(budget,current);
        const next=round(Math.max(0,current-applied));
        const list=steps.get(id)!; const last=list[list.length-1];
        last.payment=round(last.payment+applied); last.endingBalance=next;
        remaining.set(id,next); totalPayments+=applied; budget=round(budget-applied);
        if(next===0){remaining.delete(id);if(!order.includes(id))order.push(id);}
        if(!remaining.size)break;
      }
    }
  }
  const projections=[...steps.entries()].map(([debtId,list])=>({debtId,payoffMonth:list.at(-1)?.endingBalance===0?list.at(-1)!.month:null,totalInterest:round(list.reduce((s,x)=>s+x.interest,0)),totalPayments:round(list.reduce((s,x)=>s+x.payment,0)),steps:list}));
  return {strategy,payoffMonth:remaining.size?null:month,totalInterest:round(totalInterest),totalPayments:round(totalPayments),order,projections};
}
