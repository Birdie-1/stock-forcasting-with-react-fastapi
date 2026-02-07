# Stock Forecasting System with React & FastAPI

A modern inventory management and demand forecasting system built with React frontend and FastAPI backend, featuring ARIMA-based forecasting models.

## Features

- 📊 **Dashboard** - Real-time inventory statistics and recent transactions
- 📦 **Product Management** - Add, edit, and manage products with detailed information
- 💰 **Transaction Tracking** - Record stock in/out transactions (automatically synced to Sales History)
- 📈 **Demand Forecasting** - ARIMA-based forecasting with confidence intervals and recommended order quantity
- 📉 **Analytics & Reports** - Deep dive into sales trends, best sellers, and stock health with interactive charts
- 📤 **Data Import** - Upload sales data via CSV files (automatically deducts stock and records transactions)
- 🎯 **Inventory Metrics** - EOQ, Safety Stock, and Reorder Point calculations

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- SQLite - Lightweight database
- Pandas & NumPy - Data processing
- Statsmodels - ARIMA forecasting models
- SciPy - Statistical calculations

### Frontend
- React 18 - UI library
- Vite - Build tool and dev server
- Tailwind CSS - Utility-first CSS framework
- Recharts - Chart visualization library
- Lucide React - Icon library

## Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- Git

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd stock-forcasting-with-react-fastapi
```

2. Run the startup script:
```bash
chmod +x start.sh
./start.sh
```

The script will:
- Create Python virtual environment
- Install backend dependencies
- Generate mock data (if database doesn't exist)
- Install frontend dependencies
- Start both backend and frontend servers

## Manual Setup

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

- `GET /` - API information
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/forecast/{product_id}` - Get demand forecast
- `POST /api/sales/upload` - Upload sales CSV
- `GET /api/dashboard` - Get dashboard statistics

API documentation available at `http://localhost:8000/docs`

## Project Structure

```
stock-forcasting-with-react-fastapi/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── generate_mock_data.py # Mock data generator
│   ├── requirements.txt     # Python dependencies
│   └── inventory.db        # SQLite database (generated)
├── frontend/
│   ├── src/
│   │   ├── app.jsx         # Main React component
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Global styles
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite configuration
└── start.sh                # Startup script
```

## Usage

1. **Add Products**: Navigate to "จัดการสินค้า" (Product Management) and add products with details like cost, lead time, etc.

2. **Record Transactions**: Use "ธุรกรรม" (Transactions) to record stock in/out movements.

3. **Upload Sales Data**: Upload CSV files with sales history via "นำเข้าข้อมูล" (Data Import).

4. **View Forecasts**: Select a product in "พยากรณ์" (Forecasting) to see demand forecasts and inventory metrics.

## CSV Upload Format

The sales CSV should have the following columns:
```csv
product_code,date,quantity
WHI001,2024-01-01,25
VOD001,2024-01-01,30
```

## License

MIT License

## Author

Naruebordee Boonma and Yotwarit Ardnonla
