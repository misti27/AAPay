import React, { useRef, useState, useEffect } from 'react';
import { Spinner } from './Spinner';

interface ReceiptUploaderProps {
  onImageSelected: (base64: string) => Promise<void>;
  isProcessing: boolean;
  id?: string; // Optional ID to trigger from outside
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ onImageSelected, isProcessing, id }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Allow external trigger if ID is provided
  useEffect(() => {
    if (id) {
        const trigger = document.getElementById(id);
        if (trigger) {
            trigger.onclick = () => fileInputRef.current?.click();
        }
    }
  }, [id]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1]; 
      await onImageSelected(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id={id} className={`w-full max-w-lg mx-auto text-center`}> 
      {/* If used as hidden trigger, we only render the input */}
      <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      
      {!id && (
        <>
            <div 
                className={`
                relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300
                ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'}
                ${isProcessing ? 'opacity-80 pointer-events-none' : 'hover:border-indigo-400'}
                `}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                
                {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-indigo-600 p-3 rounded-full mb-4 shadow-lg shadow-indigo-200">
                    <Spinner />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">正在分析小票...</h3>
                    <p className="text-gray-500 mt-2">AI 正在努力识别菜品和价格</p>
                </div>
                ) : (
                <div className="flex flex-col items-center py-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">上传小票</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-xs">将小票图片拖拽至此，或点击选择</p>
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-800 transition transform active:scale-95"
                    >
                    选择图片
                    </button>
                </div>
                )}
            </div>
            
            {!isProcessing && (
                <button 
                onClick={() => onImageSelected('')} // Pass empty to skip AI
                className="mt-6 text-indigo-600 font-medium text-sm hover:underline"
                >
                跳过，手动输入
                </button>
            )}
        </>
      )}
    </div>
  );
};