import React, { useState } from 'react';
import { AppStep, Order, Participant, ReceiptItem } from './types';
import { ReceiptUploader } from './components/ReceiptUploader';
import { EditorView } from './components/EditorView';
import { ResultView } from './components/ResultView';
import { parseReceiptImage } from './services/geminiService';

const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: '1', name: '我' },
  { id: '2', name: '朋友 A' },
  { id: '3', name: '朋友 B' },
  { id: '4', name: '朋友 C' },
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Global State
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  
  // Modal State
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // --- Initial Upload ---
  const handleInitialUpload = async (base64Data: string) => {
    await createNewOrder(base64Data);
    setStep(AppStep.EDIT_AND_ASSIGN);
  };

  // --- Core Logic ---

  const createNewOrder = async (base64Data: string) => {
    let newItems: Partial<ReceiptItem>[] = [];
    
    if (base64Data) {
      setIsProcessing(true);
      try {
        newItems = await parseReceiptImage(base64Data);
      } catch (error) {
        alert("识别小票失败，转为手动输入。");
      } finally {
        setIsProcessing(false);
      }
    }

    const newOrder: Order = {
      id: crypto.randomUUID(),
      // Ensure items have full structure
      items: newItems.map(i => ({
        id: i.id || crypto.randomUUID(),
        name: i.name || '新商品',
        price: i.price || 0,
        assignedTo: participants.map(p => p.id) // Default assign to all
      })) as ReceiptItem[],
      tax: 0,
      payerId: participants[0]?.id || '1', // Default payer
      timestamp: Date.now(),
    };

    setOrders(prev => [...prev, newOrder]);
    setActiveOrderId(newOrder.id);
    setStep(AppStep.EDIT_AND_ASSIGN); // Ensure we go to edit view
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleDeleteOrder = (orderId: string) => {
    if (orders.length <= 1) {
      if (window.confirm("这是最后一笔订单，删除将清空并返回首页，确定吗？")) {
         handleReset();
      }
      return;
    }
    const newOrders = orders.filter(o => o.id !== orderId);
    setOrders(newOrders);
    if (activeOrderId === orderId) {
      setActiveOrderId(newOrders[0].id);
    }
  };

  const handleAddOrderRequest = () => {
    setShowAddOrderModal(true);
  };

  const handleAddOrderConfirm = async (base64: string) => {
    setShowAddOrderModal(false);
    await createNewOrder(base64);
  };

  const handleReset = () => {
    setStep(AppStep.UPLOAD);
    setOrders([]);
    setParticipants(DEFAULT_PARTICIPANTS);
    setActiveOrderId(null);
  };

  const handleViewResults = () => {
     setStep(AppStep.RESULT);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 text-gray-800 font-sans flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="px-4 py-3 md:p-6 bg-white shadow-sm shrink-0 z-20 relative">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg">
            AA
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">AA Pay</h1>
          {orders.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
              {orders.length} 笔订单
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative w-full max-w-6xl mx-auto md:p-6">
        
        {step === AppStep.UPLOAD && (
          <div className="w-full h-full overflow-y-auto p-4 animate-fade-in-up">
            <div className="text-center mb-6 md:mb-10 mt-4 md:mt-10">
              <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4">轻松搞定聚餐算账</h2>
              <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto">
                上传小票截图或照片，AI 自动识别菜品，支持多人多订单合并计算。
              </p>
            </div>
            <ReceiptUploader onImageSelected={handleInitialUpload} isProcessing={isProcessing} />
          </div>
        )}

        {step === AppStep.EDIT_AND_ASSIGN && activeOrderId && (
          <div className="w-full h-full animate-fade-in">
             <EditorView 
                key={activeOrderId} // Key forces re-mount when order changes, ensuring clean input state
                orders={orders}
                activeOrderId={activeOrderId}
                participants={participants}
                onUpdateParticipants={setParticipants}
                onUpdateOrder={handleUpdateOrder}
                onSelectOrder={setActiveOrderId}
                onAddOrder={handleAddOrderRequest}
                onDeleteOrder={handleDeleteOrder}
                onViewResult={handleViewResults}
             />
          </div>
        )}

        {step === AppStep.RESULT && (
          <div className="w-full h-full animate-fade-in">
            <ResultView 
              state={{ orders, participants }} 
              onReset={handleReset} 
              onBackToEdit={() => setStep(AppStep.EDIT_AND_ASSIGN)}
              onAddOrder={handleAddOrderRequest}
            />
          </div>
        )}

      </main>

      {/* Add Order Modal */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-scale-in">
             <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">添加新订单</h3>
             <div className="space-y-3">
               <button 
                 onClick={() => { document.getElementById('hidden-upload-trigger')?.click(); }}
                 className="w-full py-4 flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-100 text-indigo-700 rounded-xl transition-all group"
               >
                 <svg className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <span className="font-bold">上传小票图片</span>
               </button>
               <button 
                 onClick={() => handleAddOrderConfirm('')}
                 className="w-full py-4 flex flex-col items-center justify-center bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-xl transition-all group"
               >
                 <svg className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                 <span className="font-bold">手动输入</span>
               </button>
             </div>
             <button 
               onClick={() => setShowAddOrderModal(false)}
               className="mt-6 w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium"
             >
               取消
             </button>
          </div>
        </div>
      )}

      {/* Hidden input for the modal to trigger file selection */}
      <div className="hidden">
        <ReceiptUploader onImageSelected={handleAddOrderConfirm} isProcessing={isProcessing} id="hidden-upload-trigger" />
      </div>

    </div>
  );
};

export default App;