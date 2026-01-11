import React, { useState, useEffect } from 'react';
import { Order, Participant, ReceiptItem } from '../types';

interface EditorViewProps {
  orders: Order[];
  activeOrderId: string;
  participants: Participant[];
  onUpdateParticipants: (participants: Participant[]) => void;
  onUpdateOrder: (order: Order) => void;
  onSelectOrder: (id: string) => void;
  onAddOrder: () => void;
  onDeleteOrder: (id: string) => void;
  onViewResult: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ 
  orders, 
  activeOrderId, 
  participants, 
  onUpdateParticipants, 
  onUpdateOrder, 
  onSelectOrder,
  onAddOrder,
  onDeleteOrder,
  onViewResult
}) => {
  const currentOrder = orders.find(o => o.id === activeOrderId);
  
  if (!currentOrder) return null;

  // Local state for new item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  
  // Calculate items total
  const itemsTotal = currentOrder.items.reduce((sum, i) => sum + i.price, 0);
  
  // Grand Total Input State
  const [grandTotalInput, setGrandTotalInput] = useState<string>('');
  
  // Sync grand total input when order changes or items change significantly if not set
  useEffect(() => {
    const calculatedTotal = itemsTotal + currentOrder.tax;
    if (Math.abs(calculatedTotal - (parseFloat(grandTotalInput) || 0)) > 0.01) {
        // Only update if current input is empty or we just switched orders
        // Ideally we want to persist user input per order, but for now we re-derive from tax if possible
        // Better: let's calculate what the input SHOULD be based on state
        setGrandTotalInput((itemsTotal + currentOrder.tax).toFixed(2));
    }
  }, [activeOrderId, itemsTotal, currentOrder.tax]);


  const [editingPayer, setEditingPayer] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // --- Handlers ---

  const handleUpdateGrandTotal = (val: string) => {
      setGrandTotalInput(val);
      const newTotal = parseFloat(val) || 0;
      // Tax = Total - ItemsSum
      const newTax = newTotal - itemsTotal;
      onUpdateOrder({ ...currentOrder, tax: newTax });
  };

  const toggleAssignment = (itemId: string, participantId: string) => {
    const newItems = currentOrder.items.map(item => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedTo.includes(participantId);
      const newAssignedTo = isAssigned 
        ? item.assignedTo.filter(id => id !== participantId) 
        : [...item.assignedTo, participantId];
      return { ...item, assignedTo: newAssignedTo };
    });
    onUpdateOrder({ ...currentOrder, items: newItems });
  };

  const assignToAll = (itemId: string) => {
     const newItems = currentOrder.items.map(item => {
      if (item.id !== itemId) return item;
      const allSelected = participants.every(p => item.assignedTo.includes(p.id));
      return { ...item, assignedTo: allSelected ? [] : participants.map(p => p.id) };
     });
     onUpdateOrder({ ...currentOrder, items: newItems });
  };

  const addItem = () => {
    if (!newItemName || !newItemPrice) return;
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      assignedTo: participants.map(p => p.id)
    };
    onUpdateOrder({ ...currentOrder, items: [...currentOrder.items, newItem] });
    setNewItemName('');
    setNewItemPrice('');
  };

  const deleteItem = (id: string) => {
    onUpdateOrder({ ...currentOrder, items: currentOrder.items.filter(i => i.id !== id) });
  };

  const updateParticipantName = (id: string, name: string) => {
    onUpdateParticipants(participants.map(p => p.id === id ? { ...p, name } : p));
  };

  const addParticipant = () => {
    const newId = crypto.randomUUID();
    onUpdateParticipants([...participants, { id: newId, name: `朋友 ${participants.length}` }]);
  };

  const handlePayerChange = (payerId: string) => {
    onUpdateOrder({ ...currentOrder, payerId });
    setEditingPayer(false);
  };

  const currentPayerName = participants.find(p => p.id === currentOrder.payerId)?.name || '未选择';

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 md:bg-transparent bg-gray-50">
      
      {/* Left Column: Sidebar (Payer, Orders, People) */}
      <div className={`
        bg-white shadow-sm md:shadow-md md:rounded-xl shrink-0 
        flex flex-col md:w-1/3 transition-all duration-300 z-10
        ${isSidebarExpanded ? 'max-h-[70vh]' : 'max-h-[30vh]'} md:max-h-full md:h-full
      `}>
        {/* Mobile Toggle Handle */}
        <div 
          className="md:hidden flex justify-center pt-2 pb-1 cursor-pointer bg-gray-50 border-b border-gray-200"
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        >
           <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {/* 1. Who Paid (For THIS Order) */}
          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                谁付的款 (本单)
             </h3>
             {editingPayer ? (
                <div className="space-y-1">
                  {participants.map(p => (
                    <button 
                     key={p.id}
                     onClick={() => handlePayerChange(p.id)}
                     className={`w-full text-left px-3 py-2 rounded text-sm ${p.id === currentOrder.payerId ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-gray-50'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
             ) : (
                <div className="flex justify-between items-center bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 cursor-pointer" onClick={() => setEditingPayer(true)}>
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-indigo-400">当前:</span>
                     <span className="font-bold text-indigo-900 text-sm">{currentPayerName}</span>
                  </div>
                  <span className="text-xs text-indigo-500 font-medium">更改</span>
                </div>
             )}
          </div>

          {/* 2. Order List (The requested "Below Who Paid" feature) */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">订单列表</h3>
            <div className="space-y-2">
                {orders.map((order, idx) => (
                    <div 
                        key={order.id} 
                        onClick={() => onSelectOrder(order.id)}
                        className={`group flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${order.id === activeOrderId ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${order.id === activeOrderId ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {idx + 1}
                            </span>
                            <span className="text-sm font-medium truncate w-20 md:w-auto">
                                订单 {idx + 1}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${order.id === activeOrderId ? 'text-gray-300' : 'text-gray-500'}`}>
                                ¥{((order.items.reduce((s,i)=>s+i.price,0) + order.tax)).toFixed(0)}
                            </span>
                            {/* Delete Button (Only show on hover or if not active to avoid accidental clicks, but need a way to remove) */}
                            {orders.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }}
                                    className={`p-1 rounded hover:bg-red-500 hover:text-white transition ${order.id === activeOrderId ? 'text-gray-500' : 'text-gray-300'}`}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add Order Button */}
                <button 
                    onClick={onAddOrder}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    新增订单
                </button>
            </div>
          </div>

          {/* 3. Participants List */}
          <div className="border-t border-gray-100 pt-4 flex-1">
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">参与者 ({participants.length})</h3>
            </div>
            <div className="space-y-2">
              {participants.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-lg border border-transparent hover:border-gray-200 focus-within:border-indigo-300 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm`} style={{ backgroundColor: `hsl(${idx * 60}, 70%, 50%)`}}>
                    {p.name.charAt(0)}
                  </div>
                  <input 
                    type="text" 
                    value={p.name}
                    onChange={(e) => updateParticipantName(p.id, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 text-sm p-0 focus:ring-0"
                    placeholder="Name"
                  />
                </div>
              ))}
               <button 
                  onClick={addParticipant}
                  className="w-full mt-1 py-1.5 text-xs text-indigo-600 border border-dashed border-indigo-300 rounded hover:bg-indigo-50 transition"
               >
                 + 添加人员
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Items Editor */}
      <div className="flex-1 bg-white md:rounded-xl shadow-sm md:shadow-md flex flex-col min-h-0 overflow-hidden relative">
        <div className="px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex justify-between items-center z-10">
          <div>
            <h2 className="font-bold text-gray-800 text-sm md:text-base">
                订单详情 
                <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">
                    #{orders.findIndex(o => o.id === activeOrderId) + 1}
                </span>
            </h2>
            <p className="text-[10px] md:text-xs text-gray-500">点击下方头像分配</p>
          </div>
          <div className="text-right">
             <span className="text-xs text-gray-500 mr-2">小计:</span>
             <span className="font-mono font-bold text-base md:text-lg text-gray-700">¥{itemsTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 pb-24 md:pb-4">
           {currentOrder.items.map((item) => {
             const allSelected = participants.every(p => item.assignedTo.includes(p.id));
             
             return (
               <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <input 
                        className="font-medium text-gray-800 w-full outline-none focus:text-indigo-600 text-sm md:text-base bg-transparent truncate"
                        value={item.name}
                        onChange={(e) => {
                             const newItems = currentOrder.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i);
                             onUpdateOrder({ ...currentOrder, items: newItems });
                        }}
                        placeholder="商品名称"
                      />
                      <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate">
                        {item.assignedTo.length === 0 ? '未分配' : 
                         allSelected ? '所有人' : 
                         participants.filter(p => item.assignedTo.includes(p.id)).map(p => p.name).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                       <span className="font-mono text-gray-400 text-xs">¥</span>
                       <input 
                         type="number"
                         className="w-16 text-right font-mono font-bold text-gray-800 border-b border-gray-200 focus:border-indigo-500 outline-none text-sm md:text-base p-0"
                         value={item.price}
                         onFocus={(e) => e.target.select()}
                         onChange={(e) => {
                             const newItems = currentOrder.items.map(i => i.id === item.id ? {...i, price: parseFloat(e.target.value) || 0} : i);
                             onUpdateOrder({ ...currentOrder, items: newItems });
                         }}
                       />
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 p-1 -mt-1 -mr-1">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  {/* Avatar Selectors */}
                  <div className="flex flex-wrap gap-1.5 items-center mt-2">
                    <button 
                      onClick={() => assignToAll(item.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${allSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >
                      ALL
                    </button>
                    <div className="w-px h-5 bg-gray-200 mx-0.5"></div>
                    {participants.map((p, idx) => {
                      const isSelected = item.assignedTo.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleAssignment(item.id, p.id)}
                          className={`relative w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${isSelected ? 'border-white shadow-md scale-105' : 'opacity-40 border-transparent grayscale'}`}
                          style={{ backgroundColor: `hsl(${idx * 60}, 70%, 50%)`, color: 'white' }}
                        >
                          {p.name.charAt(0)}
                          {isSelected && (
                             <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                             </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
               </div>
             );
           })}
           
           {/* Add Manual Item Row */}
           <div className="flex gap-2 items-center p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50/50 mt-4">
              <input 
                placeholder="添加商品..." 
                className="flex-1 bg-transparent border-none text-sm outline-none"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-20 bg-transparent border-b border-gray-300 text-right text-sm outline-none"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
              />
              <button 
                onClick={addItem}
                disabled={!newItemName || !newItemPrice}
                className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg shadow hover:bg-gray-700 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                +
              </button>
           </div>
        </div>

        {/* Footer: Grand Total */}
        <div className="shrink-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
           <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-gray-900">
                本单实付金额:
              </label>
              <div className="flex items-center gap-2">
                 <span className="font-mono text-indigo-600 font-bold text-xl">¥</span>
                 <input 
                    type="number" 
                    className="text-right font-mono font-bold text-xl text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    style={{ width: `${Math.max((grandTotalInput || '').length, 5) + 5}ch` }}
                    value={grandTotalInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleUpdateGrandTotal(e.target.value)}
                 />
              </div>
           </div>
           
           {(parseFloat(grandTotalInput) || itemsTotal) !== itemsTotal && (
              <div className="text-right text-[10px] md:text-xs text-indigo-500 mb-3 font-medium">
                 {(parseFloat(grandTotalInput) || 0) > itemsTotal ? '+' : ''}
                 ¥{( (parseFloat(grandTotalInput) || 0) - itemsTotal ).toFixed(2)} (税费/优惠)
              </div>
           )}

          <button 
            onClick={onViewResult}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98]"
          >
            查看 AA 结果
          </button>
        </div>
      </div>
    </div>
  );
}