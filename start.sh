#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 เริ่มต้นระบบจัดการสต๊อกและคาดการณ์สินค้า"
echo "================================================"

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 สร้าง Python virtual environment..."
    cd backend
    # Try standard venv first, fallback to virtualenv if path has special characters
    if python3 -m venv venv 2>/dev/null; then
        echo "✅ สร้าง venv สำเร็จด้วย python3 -m venv"
    else
        echo "⚠️  python3 -m venv ล้มเหลว (อาจเป็นเพราะชื่อโฟลเดอร์มีอักขระพิเศษ) ใช้ virtualenv แทน..."
        python3 -m virtualenv venv || virtualenv venv
    fi
    cd ..
fi

# Activate virtual environment and install dependencies
echo "📦 ติดตั้ง Python dependencies..."
cd backend
if [ ! -x "venv/bin/python" ]; then
    echo "❌ ไม่พบ venv/bin/python (venv อาจสร้างไม่สำเร็จ)"
    exit 1
fi

./venv/bin/python -m pip install -r requirements.txt

# Check if database exists, if not generate mock data
if [ ! -f "inventory.db" ]; then
    echo "🗄️  สร้างข้อมูลตัวอย่าง..."
    ./venv/bin/python generate_mock_data.py
fi

# Start backend in background
echo "🔧 เริ่มต้น Backend Server (Port 8000)..."
./venv/bin/python main.py &
BACKEND_PID=$!
cd ..

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 ติดตั้ง Frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start frontend
echo "🎨 เริ่มต้น Frontend (Port 3000)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules ไม่พบ กำลังติดตั้ง dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ ระบบพร้อมใช้งาน!"
echo "================================================"
echo "Backend API:  http://localhost:8000"
echo "Frontend:     http://localhost:3000"
echo "================================================"
echo ""
echo "กด Ctrl+C เพื่อหยุดระบบ"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait