import sqlite3
import pandas as pd
import os

# Database path
DATABASE = "inventory.db"
PRODUCT_OUTPUT = "product_data.csv"
SALES_OUTPUT = "sales_data.csv"

def export_data():
    if not os.path.exists(DATABASE):
        print(f"Error: Database {DATABASE} not found.")
        return

    try:
        conn = sqlite3.connect(DATABASE)
        
        # Export Products
        print(f"Exporting products to {PRODUCT_OUTPUT}...")
        product_query = "SELECT * FROM products"
        product_df = pd.read_sql_query(product_query, conn)
        product_df.to_csv(PRODUCT_OUTPUT, index=False, encoding='utf-8-sig')
        print(f"Successfully exported {len(product_df)} products.")
        
        # Export Sales History (with product context)
        print(f"Exporting sales history to {SALES_OUTPUT}...")
        sales_query = """
            SELECT s.id, p.code as product_code, p.name as product_name, s.sale_date, s.quantity
            FROM sales_history s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sale_date DESC
        """
        sales_df = pd.read_sql_query(sales_query, conn)
        sales_df.to_csv(SALES_OUTPUT, index=False, encoding='utf-8-sig')
        print(f"Successfully exported {len(sales_df)} sales records.")
        
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    export_data()
