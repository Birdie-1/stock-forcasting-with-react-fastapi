
import sqlite3
import pandas as pd

DATABASE = "backend/inventory.db"

def inspect():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # 1. Find product with max sales on a single day
    print("Finding product with highest single-day sales...")
    cursor.execute("""
        SELECT product_id, sale_date, SUM(quantity) as daily_total, COUNT(*) as record_count 
        FROM sales_history 
        GROUP BY product_id, sale_date 
        ORDER BY daily_total DESC 
        LIMIT 5
    """)
    top_days = cursor.fetchall()
    print("Top 5 Daily Sales:")
    for row in top_days:
        print(f"Product {row[0]}, Date {row[1]}: Total {row[2]}, Records: {row[3]}")
        
    if not top_days:
        print("No sales data found.")
        return

    target_pid = top_days[0][0]
    print(f"\nInspecting Product {target_pid} detailed history (Last 14 days)...")
    
    # 2. Get last 14 days for this product
    cursor.execute("""
        SELECT sale_date, quantity, id
        FROM sales_history 
        WHERE product_id = ?
        ORDER BY sale_date DESC
        LIMIT 14
    """, (target_pid,))
    
    rows = cursor.fetchall()
    for row in rows:
        print(f"Date: {row[0]}, Qty: {row[1]}, ID: {row[2]}")
        
    conn.close()

if __name__ == "__main__":
    inspect()
