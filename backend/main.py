from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import io
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import itertools
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="Inventory Forecasting System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE = "inventory.db"

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Products table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            unit TEXT,
            unit_cost REAL,
            ordering_cost REAL,
            holding_cost_percentage REAL,
            lead_time_days INTEGER,
            current_stock INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Sales history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            sale_date DATE,
            quantity INTEGER,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)
    
    # Transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            transaction_type TEXT,
            quantity INTEGER,
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            note TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)
    
    conn.commit()
    conn.close()

# Pydantic models
class Product(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    unit: str = "ขวด"
    unit_cost: float
    ordering_cost: float = 500.0
    holding_cost_percentage: float = 0.2
    lead_time_days: int = 7
    current_stock: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    ordering_cost: Optional[float] = None
    holding_cost_percentage: Optional[float] = None
    lead_time_days: Optional[int] = None
    current_stock: Optional[int] = None

class Transaction(BaseModel):
    product_id: int
    transaction_type: str  # 'in' or 'out'
    quantity: int
    note: Optional[str] = None

class SalesData(BaseModel):
    product_id: int
    sale_date: str
    quantity: int

# ARIMA Functions
def find_best_arima_params(data, max_p=3, max_d=2, max_q=3):
    """Find best ARIMA parameters using AIC"""
    best_aic = np.inf
    best_params = None
    
    # Check if data is stationary
    adf_result = adfuller(data)
    is_stationary = adf_result[1] < 0.05
    
    d_range = range(0, 1) if is_stationary else range(1, max_d + 1)
    
    for p, d, q in itertools.product(range(max_p + 1), d_range, range(max_q + 1)):
        if p == 0 and q == 0:
            continue
        try:
            model = ARIMA(data, order=(p, d, q))
            fitted_model = model.fit()
            if fitted_model.aic < best_aic:
                best_aic = fitted_model.aic
                best_params = (p, d, q)
        except:
            continue
    
    return best_params if best_params else (1, 1, 1)

def forecast_demand(sales_data, periods=30):
    """Forecast demand using ARIMA"""
    if len(sales_data) < 10:
        return None, None, None
    
    # Prepare data
    df = pd.DataFrame(sales_data)
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    df = df.sort_values('sale_date')
    df.set_index('sale_date', inplace=True)
    
    # Resample to daily and fill missing dates
    daily_sales = df.resample('D')['quantity'].sum().fillna(0)
    
    # Find best parameters
    best_params = find_best_arima_params(daily_sales.values)
    
    # Fit model
    model = ARIMA(daily_sales, order=best_params)
    fitted_model = model.fit()
    
    # Forecast
    forecast_result = fitted_model.forecast(steps=periods)
    forecast_values = np.maximum(forecast_result, 0)  # No negative forecasts
    
    # Calculate confidence intervals
    forecast_obj = fitted_model.get_forecast(steps=periods)
    forecast_ci = forecast_obj.conf_int()
    
    return forecast_values.tolist(), forecast_ci.values.tolist(), best_params

def calculate_eoq(annual_demand, ordering_cost, holding_cost):
    """Calculate Economic Order Quantity"""
    if annual_demand <= 0 or holding_cost <= 0:
        return 0
    eoq = np.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
    return round(eoq, 2)

def calculate_safety_stock(demand_std, lead_time_days, service_level=0.95):
    """Calculate Safety Stock using Z-score method"""
    from scipy import stats
    z_score = stats.norm.ppf(service_level)
    safety_stock = z_score * demand_std * np.sqrt(lead_time_days)
    return round(safety_stock, 2)

def calculate_rop(avg_daily_demand, lead_time_days, safety_stock):
    """Calculate Reorder Point"""
    lead_time_demand = avg_daily_demand * lead_time_days
    rop = lead_time_demand + safety_stock
    return round(rop, 2)

def get_product_demand_metrics(product_id, conn):
    """Calculate consistent demand metrics for a product"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sale_date, quantity FROM sales_history 
        WHERE product_id = ?
        ORDER BY sale_date
    """, (product_id,))
    
    rows = cursor.fetchall()
    if not rows or len(rows) < 2:
        return 0.0, 0.0
        
    sales_data = [dict(row) for row in rows]
    df = pd.DataFrame(sales_data)
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    
    # Resample to daily and fill missing dates to get accurate daily stats
    daily_sales = df.resample('D', on='sale_date')['quantity'].sum()
    
    return float(daily_sales.mean()), float(daily_sales.std() or 0.0)

# API Endpoints
@app.on_event("startup")
async def startup():
    init_db()

@app.get("/")
async def root():
    return {"message": "Inventory Forecasting System API"}

# Products endpoints
@app.post("/api/products")
async def create_product(product: Product):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO products (code, name, category, unit, unit_cost, 
                                ordering_cost, holding_cost_percentage, 
                                lead_time_days, current_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (product.code, product.name, product.category, product.unit,
              product.unit_cost, product.ordering_cost, 
              product.holding_cost_percentage, product.lead_time_days,
              product.current_stock))
        conn.commit()
        product_id = cursor.lastrowid
        return {"id": product_id, "message": "Product created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Product code already exists")
    finally:
        conn.close()

@app.get("/api/products")
async def get_products(search: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    
    if search:
        cursor.execute("""
            SELECT * FROM products 
            WHERE code LIKE ? OR name LIKE ? OR category LIKE ?
        """, (f"%{search}%", f"%{search}%", f"%{search}%"))
    else:
        cursor.execute("SELECT * FROM products")
    
    products = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return products

@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    conn.close()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return dict(product)

@app.put("/api/products/{product_id}")
async def update_product(product_id: int, product: ProductUpdate):
    conn = get_db()
    cursor = conn.cursor()
    
    update_fields = []
    values = []
    
    if product.name is not None:
        update_fields.append("name = ?")
        values.append(product.name)
    if product.category is not None:
        update_fields.append("category = ?")
        values.append(product.category)
    if product.unit is not None:
        update_fields.append("unit = ?")
        values.append(product.unit)
    if product.unit_cost is not None:
        update_fields.append("unit_cost = ?")
        values.append(product.unit_cost)
    if product.ordering_cost is not None:
        update_fields.append("ordering_cost = ?")
        values.append(product.ordering_cost)
    if product.holding_cost_percentage is not None:
        update_fields.append("holding_cost_percentage = ?")
        values.append(product.holding_cost_percentage)
    if product.lead_time_days is not None:
        update_fields.append("lead_time_days = ?")
        values.append(product.lead_time_days)
    if product.current_stock is not None:
        update_fields.append("current_stock = ?")
        values.append(product.current_stock)
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(product_id)
    query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = ?"
    
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    
    return {"message": "Product updated successfully"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    conn.close()
    return {"message": "Product deleted successfully"}

# Transactions endpoints
@app.post("/api/transactions")
async def create_transaction(transaction: Transaction):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if product exists
    cursor.execute("SELECT current_stock FROM products WHERE id = ?", 
                  (transaction.product_id,))
    result = cursor.fetchone()
    
    if not result:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    current_stock = result[0]
    
    # Calculate new stock
    if transaction.transaction_type == 'in':
        new_stock = current_stock + transaction.quantity
    elif transaction.transaction_type == 'out':
        if current_stock < transaction.quantity:
            conn.close()
            raise HTTPException(status_code=400, detail="Insufficient stock")
        new_stock = current_stock - transaction.quantity
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid transaction type")
    
    # Insert transaction
    cursor.execute("""
        INSERT INTO transactions (product_id, transaction_type, quantity, note)
        VALUES (?, ?, ?, ?)
    """, (transaction.product_id, transaction.transaction_type, 
          transaction.quantity, transaction.note))
    
    # NEW: If 'out', add to sales_history for forecasting/analytics
    if transaction.transaction_type == 'out':
        cursor.execute("""
            INSERT INTO sales_history (product_id, sale_date, quantity)
            VALUES (?, date('now'), ?)
        """, (transaction.product_id, transaction.quantity))
    
    # Update product stock
    cursor.execute("UPDATE products SET current_stock = ? WHERE id = ?",
                  (new_stock, transaction.product_id))
    
    conn.commit()
    conn.close()
    
    return {"message": "Transaction recorded successfully", "new_stock": new_stock}

@app.get("/api/transactions")
async def get_transactions(product_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    
    if product_id:
        cursor.execute("""
            SELECT t.*, p.name as product_name, p.code as product_code
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.product_id = ?
            ORDER BY t.transaction_date DESC
        """, (product_id,))
    else:
        cursor.execute("""
            SELECT t.*, p.name as product_name, p.code as product_code
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            ORDER BY t.transaction_date DESC
        """)
    
    transactions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return transactions

# Sales endpoints
@app.post("/api/sales/bulk")
async def create_bulk_sales(sales: List[SalesData]):
    conn = get_db()
    cursor = conn.cursor()
    
    for sale in sales:
        cursor.execute("""
            INSERT INTO sales_history (product_id, sale_date, quantity)
            VALUES (?, ?, ?)
        """, (sale.product_id, sale.sale_date, sale.quantity))
    
    conn.commit()
    conn.close()
    
    return {"message": f"{len(sales)} sales records created successfully"}

@app.post("/api/sales/upload")
async def upload_sales_csv(file: UploadFile = File(...)):
    """Upload sales data from CSV file
    Expected format: product_code, date, quantity
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate columns
        required_cols = ['product_code', 'date', 'quantity']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, 
                              detail=f"CSV must contain columns: {required_cols}")
        
        conn = get_db()
        cursor = conn.cursor()
        
        inserted = 0
        for _, row in df.iterrows():
            # Get product_id from code
            cursor.execute("SELECT id FROM products WHERE code = ?", 
                          (row['product_code'],))
            result = cursor.fetchone()
            
            if result:
                product_id = result[0]
                # 1. Insert into sales_history (for forecasting)
                cursor.execute("""
                    INSERT INTO sales_history (product_id, sale_date, quantity)
                    VALUES (?, ?, ?)
                """, (product_id, row['date'], int(row['quantity'])))

                # 2. Insert into transactions (for stock tracking history)
                cursor.execute("""
                    INSERT INTO transactions (product_id, transaction_type, quantity, note)
                    VALUES (?, 'out', ?, 'Auto-imported from CSV')
                """, (product_id, int(row['quantity'])))

                # 3. Update current stock (Deduct stock)
                cursor.execute("""
                    UPDATE products 
                    SET current_stock = current_stock - ? 
                    WHERE id = ?
                """, (int(row['quantity']), product_id))
                
                inserted += 1
        
        conn.commit()
        conn.close()
        
        return {"message": f"Uploaded {inserted} sales records successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/sales/{product_id}")
async def get_sales_history(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM sales_history 
        WHERE product_id = ?
        ORDER BY sale_date
    """, (product_id,))
    
    sales = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return sales

# Forecasting endpoints
@app.get("/api/forecast/{product_id}")
async def get_forecast(product_id: int, periods: int = 30):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get product info
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = dict(product)
    
    # Get sales history
    cursor.execute("""
        SELECT sale_date, quantity FROM sales_history 
        WHERE product_id = ?
        ORDER BY sale_date
    """, (product_id,))
    
    sales_data = [dict(row) for row in cursor.fetchall()]
    # Move conn.close() later after metrics calculation
    
    if len(sales_data) < 10:
        raise HTTPException(status_code=400, 
                          detail="Insufficient sales data for forecasting (minimum 10 records)")
    
    # Forecast
    forecast_values, forecast_ci, arima_params = forecast_demand(sales_data, periods)
    
    if forecast_values is None:
        raise HTTPException(status_code=500, detail="Forecasting failed")
    
    # Calculate statistics
    avg_daily_demand, demand_std = get_product_demand_metrics(product_id, conn)
    conn.close() # Now we can close it
    annual_demand = avg_daily_demand * 365
    
    # Calculate inventory metrics
    holding_cost = product['unit_cost'] * product['holding_cost_percentage']
    
    eoq = calculate_eoq(annual_demand, product['ordering_cost'], holding_cost)
    safety_stock = calculate_safety_stock(demand_std, product['lead_time_days'])
    rop = calculate_rop(avg_daily_demand, product['lead_time_days'], safety_stock)
    
    # Prepare forecast dates
    last_date = pd.to_datetime(sales_data[-1]['sale_date'])
    forecast_dates = [(last_date + timedelta(days=i+1)).strftime('%Y-%m-%d') 
                     for i in range(periods)]
    
    return {
        "product": product,
        "forecast": {
            "dates": forecast_dates,
            "values": forecast_values,
            "confidence_intervals": forecast_ci,
            "arima_params": {"p": arima_params[0], "d": arima_params[1], "q": arima_params[2]}
        },
        "metrics": {
            "avg_daily_demand": round(avg_daily_demand, 2),
            "demand_std": round(demand_std, 2),
            "annual_demand": round(annual_demand, 2),
            "eoq": eoq,
            "safety_stock": safety_stock,
            "reorder_point": rop,
            "current_stock": product['current_stock'],
            "stock_status": "ต้องสั่งซื้อ" if product['current_stock'] <= rop else "ปกติ"
        }
    }

# Dashboard endpoint
@app.get("/api/dashboard")
async def get_dashboard():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Total products
    cursor.execute("SELECT COUNT(*) as total FROM products")
    total_products = cursor.fetchone()[0]
    
    # 2. Total stock value
    cursor.execute("SELECT SUM(current_stock * unit_cost) as total_value FROM products")
    total_value = cursor.fetchone()[0] or 0
    
    # 3. Recent transactions
    cursor.execute("""
        SELECT t.*, p.name as product_name 
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        ORDER BY t.transaction_date DESC
        LIMIT 10
    """)
    recent_transactions = [dict(row) for row in cursor.fetchall()]

    # 4. Products needing reorder (Stock <= ROP)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    
    low_stock_products = []
    for product in products:
        product = dict(product)
        avg_daily, demand_std = get_product_demand_metrics(product['id'], conn)
        
        if avg_daily > 0:
            safety_stock = calculate_safety_stock(demand_std, product['lead_time_days'])
            rop = calculate_rop(avg_daily, product['lead_time_days'], safety_stock)
            
            if product['current_stock'] <= rop:
                annual_demand = avg_daily * 365
                holding_cost = product['unit_cost'] * product['holding_cost_percentage']
                eoq = calculate_eoq(annual_demand, product['ordering_cost'], holding_cost)
                
                low_stock_products.append({
                    "id": product["id"],
                    "name": product["name"],
                    "code": product["code"],
                    "current_stock": product["current_stock"],
                    "unit": product["unit"],
                    "rop": int(rop),
                    "eoq": int(eoq)
                })
    
    conn.close()
    
    return {
        "total_products": total_products,
        "low_stock_count": len(low_stock_products),
        "low_stock_products": low_stock_products,
        "total_stock_value": total_value,
        "recent_transactions": recent_transactions
    }

@app.get("/api/analytics")
async def get_analytics():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Sales Trends (Last 30 days)
    cursor.execute("""
        SELECT sale_date, SUM(quantity) as total_qty
        FROM sales_history
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY sale_date
        ORDER BY sale_date
    """)
    sales_trends = [dict(row) for row in cursor.fetchall()]
    
    # 2. Top Moving Products (Top 10 by Sales Quantity)
    cursor.execute("""
        SELECT p.name, SUM(s.quantity) as total_qty
        FROM sales_history s
        JOIN products p ON s.product_id = p.id
        GROUP BY p.id
        ORDER BY total_qty DESC
        LIMIT 10
    """)
    top_products = [dict(row) for row in cursor.fetchall()]
    
    # 3. Inventory Value by Category
    cursor.execute("""
        SELECT category, SUM(current_stock * unit_cost) as value
        FROM products
        GROUP BY category
        ORDER BY value DESC
    """)
    category_value = [dict(row) for row in cursor.fetchall()]
    
    # 4. Inventory Turn Rate (Simplifed: Total Sales / Total Current Stock)
    cursor.execute("""
        SELECT 
            (SELECT SUM(s.quantity * p.unit_cost) FROM sales_history s JOIN products p ON s.product_id = p.id) as total_sales_value,
            (SELECT SUM(current_stock * unit_cost) FROM products) as current_inv_value
    """)
    turn_metrics = dict(cursor.fetchone())
    turn_rate = 0
    if turn_metrics['current_inv_value'] and turn_metrics['current_inv_value'] > 0:
        turn_rate = turn_metrics['total_sales_value'] / turn_metrics['current_inv_value']
    
    # 5. Stock Health (Healthy vs Low vs Out)
    cursor.execute("""
        SELECT p.id, p.current_stock, p.lead_time_days,
               (SELECT AVG(quantity) FROM sales_history WHERE product_id = p.id) as avg_sales
        FROM products p
    """)
    health_check = cursor.fetchall()
    
    stats = {"healthy": 0, "low_stock": 0, "out_of_stock": 0}
    for p in health_check:
        p = dict(p)
        if p['current_stock'] <= 0:
            stats["out_of_stock"] += 1
        else:
            avg_daily, demand_std = get_product_demand_metrics(p['id'], conn)
            
            if avg_daily > 0:
                ss = calculate_safety_stock(demand_std, p['lead_time_days'])
                rop = calculate_rop(avg_daily, p['lead_time_days'], ss)
                
                if p['current_stock'] <= rop:
                    stats["low_stock"] += 1
                else:
                    stats["healthy"] += 1
            else:
                # No sales data, assume healthy if stock > 0
                stats["healthy"] += 1

    conn.close()
    
    return {
        "sales_trends": sales_trends,
        "top_products": top_products,
        "category_value": category_value,
        "turn_rate": round(turn_rate, 2),
        "stock_health": stats
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)