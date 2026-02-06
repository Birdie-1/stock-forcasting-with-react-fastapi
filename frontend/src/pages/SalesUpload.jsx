import React, { useState } from 'react';
import { Upload, Download } from 'lucide-react';

import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000'; 

const SalesUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
        // We can't use apiCall easily if we want to handle FormData without manually setting headers (fetch does it automatically).
        // So I'll just use fetch here.
      const response = await fetch(`${API_BASE_URL}/api/sales/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploadResult({ success: true, message: result.message });
      toast.success('อัพโหลดข้อมูลสำเร็จ');
    } catch (error) {
      setUploadResult({ success: false, message: error.message });
      toast.error('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setUploading(false);
      // Reset input layout
      e.target.value = null; 
    }
  };

  const downloadTemplate = () => {
    const csv = 'product_code,date,quantity\nWHI001,2024-01-01,25\nVOD001,2024-01-01,30\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-900">นำเข้าข้อมูลยอดขาย</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Upload className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">อัพโหลดไฟล์ CSV</h3>
            <p className="text-gray-800 font-medium">
              ไฟล์ต้องมีคอลัมน์: product_code, date, quantity
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-500 transition-colors group cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center">
                 {uploading ? (
                    <>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mb-3"></div>
                        <p className="text-amber-800 font-medium">กำลังอัพโหลด...</p>
                    </>
                 ) : (
                    <>
                        <div className="bg-amber-100 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-gray-600 font-medium">ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p>
                        <p className="text-sm text-gray-500 mt-1">รองรับไฟล์ .csv เท่านั้น</p>
                    </>
                 )}
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลดไฟล์ตัวอย่าง
            </button>

            {uploadResult && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                uploadResult.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className={`p-1 rounded-full ${uploadResult.success ? 'bg-green-200' : 'bg-red-200'}`}>
                    {uploadResult.success ? (
                         <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                         <svg className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </div>
                <p className="font-medium">{uploadResult.message}</p>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">รูปแบบไฟล์ CSV:</h4>
            <div className="text-sm text-amber-800 bg-white p-3 rounded border border-amber-200 overflow-x-auto font-mono">
{`product_code,date,quantity
WHI001,2024-01-01,25
VOD001,2024-01-01,30
BEE001,2024-01-02,85`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesUpload;
