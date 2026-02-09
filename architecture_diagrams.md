# System Architecture & Scope

This document outlines the system scope, user roles, and architectural diagrams for the Stock Forecasting System.

## 1. System Scope & User Roles

The system is designed to support two primary user roles with distinct responsibilities:

### 1.3.1 Warehouse Keeper (ผู้ดูแลคลังสินค้า)
Responsible for day-to-day operations and data entry.
*   **Product Management**: Add, edit, search, and delete product information.
*   **Transaction Management**: Record stock-in and stock-out transactions.
*   **Data Import**: Import historical sales data via CSV or Excel files.
*   **Forecast Verification**: Check demand forecast results.
*   **Metric Review**: View calculated inventory metrics (Economic Order Quantity (EOQ), Safety Stock, Reorder Point (ROP)).
*   **Stock Monitoring**: Check product movement history and current stock levels via summary views.

### 1.3.2 Warehouse Manager (ผู้จัดการคลังสินค้า)
Responsible for high-level monitoring, analysis, and decision making.
*   **Inventory Overview**: Monitor total stock inventory and individual product status.
*   **Demand Analysis**: View future demand trends based on forecasting models.
*   **Replenishment Status**: specific check on replenishment needs (Current vs. Safety Stock vs. ROP).
*   **Performance Tracking**: Monitor inventory management efficiency via KPI summaries.
*   **Reporting**: View reports and graphical visualizations of system data.

---

## 2. Context Diagram

The Context Diagram illustrates the interaction between the two user roles, the system, and external data sources.

```mermaid
graph TD
    Keeper([Warehouse Keeper])
    Manager([Warehouse Manager])
    System[["Stock Forecasting System"]]
    CSV[Sales Data CSV]

    %% Keeper Interactions
    Keeper -- "Product Data (CRUD)" --> System
    Keeper -- "Stock In/Out Transactions" --> System
    Keeper -- "Sales Data Import" --> System
    System -- "Operational Status & Metrics" --> Keeper

    %% Manager Interactions
    Manager -- "Request Reports & Dashboard" --> System
    System -- "Inventory Overview & KPIs" --> Manager
    System -- "Forecast Trends & Graphs" --> Manager

    %% External Data
    CSV -- "Historical Sales Data" --> System
```

---

## 3. Data Flow Diagram (DFD) Level 0

The DFD Level 0 details the internal processes and how they relate to the specific user roles.

```mermaid
graph TD
    %% Entities
    Keeper([Warehouse Keeper])
    Manager([Warehouse Manager])
    CSV[Sales Data CSV]
    
    %% Processes
    P1[1.0 Manage Products]
    P2[2.0 Manage Transactions]
    P3[3.0 Ingest Sales Data]
    P4[4.0 Analyze Demand & Inventory]
    P5[5.0 Provide Dashboard & Reports]
    P6[6.0 Search & Filter Information]
    
    %% Data Stores
    DS1[(D1: Products)]
    DS2[(D2: Sales History)]
    DS3[(D3: Transactions)]
    
    %% Keeper Flows
    Keeper -- "Add/Edit Product" --> P1
    P1 -- "Product Details" --> Keeper
    P1 -- "Update Info" --> DS1
    
    Keeper -- "Record Stock In/Out" --> P2
    P2 -- "Transaction Status" --> Keeper
    P2 -- "Log Transaction" --> DS3
    P2 -- "Update Stock Level" --> DS1
    
    CSV -- "Bulk Sales File" --> P3
    Keeper -- "Trigger Import" --> P3
    P3 -- "Store Sales" --> DS2
    
    Keeper -- "Check Forecasts" --> P4
    
    Keeper -- "Search Criteria" --> P6
    P6 -- "Search Results" --> Keeper

    %% Manager Flows
    Manager -- "View Overview/KPIs" --> P5
    P5 -- "Visualizations & Reports" --> Manager

    Manager -- "Search Criteria" --> P6
    P6 -- "Search Results" --> Manager
    
    %% Internal Data Flows
    DS1 -- "Product Data" --> P4
    DS2 -- "Sales History" --> P4
    P4 -- "Forecasts & EOQ/ROP" --> P5
    P4 -- "Forecasting Results" --> Keeper
    
    DS1 -- "Current Stock" --> P5
    DS3 -- "Recent Activity" --> P5
    DS2 -- "Sales Trends" --> P5

    DS1 -- "Product Info" --> P6
    DS3 -- "Transaction Records" --> P6
```

### Process Descriptions

1.  **1.0 Manage Products**: Allows the **Warehouse Keeper** to maintain product master data (cost, lead time, attributes).
2.  **2.0 Manage Transactions**: Enables the **Warehouse Keeper** to record physical stock movements, updating inventory levels in real-time.
3.  **3.0 Ingest Sales Data**: Processes bulk sales history uploads initiated by the **Warehouse Keeper** to feed the forecasting engine.
4.  **4.0 Analyze Demand & Inventory**: System process that runs ARIMA forecasting and calculates EOQ, Safety Stock, and ROP. Results are used by the Keeper for verification and aggregated for the Manager.
5.  **5.0 Provide Dashboard & Reports**: Aggregates all system data to provide the **Warehouse Manager** with high-level insights, graphs, and performance indicators.
6.  **6.0 Search & Filter Information**: Allows both the **Warehouse Keeper** and **Warehouse Manager** to query product details and transaction history using specific criteria (e.g., product code, date range).
