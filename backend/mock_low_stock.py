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
import random

warnings.filterwarnings('ignore')

# Database setup
DATABASE = "inventory.db"

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

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

if __name__ == "__main__":
    print("Starting mock data generation...")
    conn = get_db()
    cursor = conn.cursor()
    
    # Reset all products to be fairly high stock first (e.g., 1000)
    cursor.execute("UPDATE products SET current_stock = 1000")
    print("Reset all products to 1000 stock.")
    
    # Get all products
    cursor.execute("SELECT id, name, lead_time_days FROM products")
    products = cursor.fetchall()
    
    # Select 5 random products to be low stock
    if len(products) > 5:
        target_products = random.sample(products, 5)
    else:
        target_products = products
        
    print(f"\nTargeting {len(target_products)} products to be low stock:")
    
    for p in target_products:
        p_id = p['id']
        p_name = p['name']
        lead_time = p['lead_time_days']
        
        # Calculate ROP
        avg_daily, demand_std = get_product_demand_metrics(p_id, conn)
        
        if avg_daily > 0:
            safety_stock = calculate_safety_stock(demand_std, lead_time)
            rop = calculate_rop(avg_daily, lead_time, safety_stock)
            
            # Set stock to be slightly lower than ROP (e.g. 50-90% of ROP)
            # Ensure it's at least 0
            if rop > 0:
                new_stock = int(rop * random.uniform(0.5, 0.9))
            else:
                 new_stock = 0
            
            cursor.execute("UPDATE products SET current_stock = ? WHERE id = ?", (new_stock, p_id))
            print(f" - {p_name}: AvgSales={avg_daily:.2f}, ROP={rop:.2f}, Set Stock -> {new_stock}")
        else:
            print(f" - {p_name}: No sales data, skipping.")
            
    conn.commit()
    conn.close()
    print("\nMock data update complete!")