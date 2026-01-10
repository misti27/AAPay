import React from 'react';
import { BillState } from '../types';

interface ResultViewProps {
  state: BillState;
  onReset: () => void;
  onBackToEdit: () => void;
  onAddOrder: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ state, onReset, onBackToEdit, onAddOrder }) => {
  const { orders, participants } = state;

  // 1. Calculate Total Bill (Sum of all orders)
  const totalBill = orders.reduce((total, order) => {
    const orderItemsTotal = order.items.reduce((s, i) => s + i.price, 0);
    return total + orderItemsTotal + order.tax;
  }, 0);

  // 2. Calculate Net Balances by aggregating all orders
  const netBalances: Record<string, number> = {};
  participants.forEach(p => netBalances[p.id] = 0);

  orders.forEach(order => {
    const orderItemsTotal = order.items.reduce((s, i) => s + i.price, 0);
    const orderFinalTotal = orderItemsTotal + order.tax;

    // Calculate consumption per person for THIS order
    const consumption: Record<string, number> = {};
    participants.forEach(p => consumption[p.id] = 0);

    order.items.forEach(item => {
      if (item.assignedTo.length > 0) {
        const splitPrice = item.price / item.assignedTo.length;
        item.assignedTo.forEach(pid => {
          if (consumption[pid] !== undefined) consumption[pid] += splitPrice;
        });
      } else {
        const splitPrice = item.price / participants.length;
        participants.forEach(p => consumption[p.id] += splitPrice);
      }
    });

    const ratio = orderItemsTotal > 0 ? (orderFinalTotal / orderItemsTotal) : (orderFinalTotal / participants.length);

    participants.forEach(p => {
      const shouldPay = orderItemsTotal > 0 ? (consumption[p.id] * ratio) : (orderFinalTotal / participants.length);
      
      netBalances[p.id] -= shouldPay;

      if (p.id === order.payerId) {
        netBalances[p.id] += orderFinalTotal;
      }
    });
  });

  return (
    <div className="w-full h-full md:h-[85vh] max-w-2xl mx-auto bg-white md:rounded-xl shadow-lg overflow-hidden flex flex-col md:border border-gray-100">
      
      {/* Header Result Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 md:p-8 text-white shrink-0 shadow-md z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <h2 className="text-xl md:text-2xl font-bold opacity-90">总账单结果</h2>
             <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium border border-white/20">
               共 {orders.length} 笔订单
             </div>
          </div>
          
          <div>
              <p className="text-indigo-200 text-xs md:text-sm uppercase tracking-wider mb-1">所有订单总额</p>
              <div className="flex items-baseline gap-1">
                  <span className="text-2xl">¥</span>
                  <span className="font-mono font-bold text-4xl md:text-5xl">{totalBill.toFixed(2)}</span>
              </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50">
        
        {/* Person Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
           {participants.map(person => {
             const balance = netBalances[person.id];
             const isReceiver = balance > 0.01; 
             const isPayer = balance < -0.01; 
             const isSettled = Math.abs(balance) <= 0.01;

             return (
               <div key={person.id} className={`rounded-xl p-4 relative shadow-sm transition-all border ${isReceiver ? 'bg-white border-green-200 ring-1 ring-green-50' : isSettled ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-red-100'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-8 rounded-full ${isReceiver ? 'bg-green-500' : isPayer ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                        <h3 className="font-bold text-base text-gray-800">{person.name}</h3>
                    </div>
                    {isReceiver && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">收款方</span>}
                  </div>
                  
                  <div className="flex justify-between items-end">
                      <div className="text-right w-full">
                        <p className="text-xs font-medium text-gray-400 mb-0.5">
                            {isReceiver ? '应收回' : isPayer ? '需支付' : '已结清'}
                        </p>
                        <p className={`font-mono font-bold text-xl ${isReceiver ? 'text-green-600' : isPayer ? 'text-red-500' : 'text-gray-400'}`}>
                            {isSettled ? '¥0.00' : `¥${Math.abs(balance).toFixed(2)}`}
                        </p>
                      </div>
                  </div>
               </div>
             );
           })}
        </div>

        {/* Transfer Scheme */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            最优转账方案
          </h3>
          <ul className="space-y-3">
             {(() => {
                const debtors = participants.filter(p => netBalances[p.id] < -0.01).map(p => ({ id: p.id, name: p.name, amount: -netBalances[p.id] }));
                const creditors = participants.filter(p => netBalances[p.id] > 0.01).map(p => ({ id: p.id, name: p.name, amount: netBalances[p.id] }));
                
                debtors.sort((a,b) => b.amount - a.amount);
                creditors.sort((a,b) => b.amount - a.amount);

                const transfers = [];
                let i = 0; 
                let j = 0;

                while(i < debtors.length && j < creditors.length) {
                    const debtor = debtors[i];
                    const creditor = creditors[j];
                    
                    const amount = Math.min(debtor.amount, creditor.amount);
                    if (amount > 0.01) {
                        transfers.push({ from: debtor.name, to: creditor.name, amount });
                    }

                    debtor.amount -= amount;
                    creditor.amount -= amount;

                    if (debtor.amount < 0.01) i++;
                    if (creditor.amount < 0.01) j++;
                }

                if (transfers.length === 0) {
                    return <li className="text-gray-400 text-sm text-center py-2">无需转账，帐平了！</li>
                }

                return transfers.map((t, idx) => (
                    <li key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-gray-800">{t.from}</span>
                            <span className="text-gray-400 text-xs">支付给</span>
                            <span className="font-bold text-gray-800">{t.to}</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">¥{t.amount.toFixed(2)}</span>
                    </li>
                ));
             })()}
          </ul>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <button 
          onClick={onAddOrder}
          className="w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 active:bg-black transition shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          新增一笔订单
        </button>
         <button 
          onClick={onBackToEdit}
          className="w-full py-3 px-4 bg-white border border-gray-200 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition shadow-sm text-sm"
        >
          返回编辑订单
        </button>
        <button 
          onClick={onReset}
          className="w-full py-3 px-4 bg-white border border-gray-200 text-red-500 font-semibold rounded-xl hover:bg-red-50 active:bg-red-100 transition shadow-sm text-sm"
        >
          清空所有数据重新开始
        </button>
      </div>
    </div>
  );
};