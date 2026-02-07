# System Architecture Diagrams

This document provides the Context Diagram and Data Flow Diagram (DFD) Level 0 for the Stock Forecasting System.

## Context Diagram

The Context Diagram shows the system as a single process and its interactions with external entities.

```mermaid
graph TD
    User([User])
    System[["Stock Forecasting System"]]
    CSV[Sales Data CSV]

    User -- "Product Details, Transactions, Forecast Requests" --> System
    CSV -- "Historical Sales Data" --> System
    System -- "Product Lists, Dashboard Metrics, Forecasts" --> User
```

---

## Data Flow Diagram (DFD) Level 0

The DFD Level 0 breaks down the system into its major functional processes and data stores.

```mermaid
graph TD
    %% Entities
    User([User])
    CSV[Sales Data CSV]
    
    %% Processes
    P1[1.0 Manage Products]
    P2[2.0 Manage Transactions]
    P3[3.0 Ingest Sales Data]
    P4[4.0 Analyze Demand & Inventory]
    P5[5.0 Provide Dashboard]
    
    %% Data Stores
    DS1[(D1: Products)]
    DS2[(D2: Sales History)]
    DS3[(D3: Transactions)]
    
    %% Data Flows
    User -- "Product Creation/Edit" --> P1
    P1 -- "Product Details" --> User
    P1 -- "CRUD Operations" --> DS1
    DS1 -- "Product Info" --> P1
    
    User -- "Stock In/Out Recording" --> P2
    P2 -- "Transaction History" --> User
    P2 -- "Record Transaction" --> DS3
    P2 -- "Update Stock Levels" --> DS1
    DS3 -- "Recent Transactions" --> P2
    
    CSV -- "Bulk Sales Upload" --> P3
    P3 -- "Store Sales Records" --> DS2
    DS1 -- "Lookup Product ID" --> P3
    
    DS1 -- "Product Specs & Stock" --> P4
    DS2 -- "Historical Sales Vol" --> P4
    P4 -- "ARIMA Forecast & Metrics" --> User
    
    DS1 -- "Stock Status" --> P5
    DS2 -- "Sales Trends" --> P5
    DS3 -- "Recent Activity" --> P5
    P5 -- "Dashboard Summary" --> User
```

### Process Descriptions

1.  **1.0 Manage Products**: Handles the registration and maintenance of product information including cost, lead time, and categories.
2.  **2.0 Manage Transactions**: Records manual stock movements (incoming/outgoing) and updates current inventory levels.
3.  **3.0 Ingest Sales Data**: Processes bulk sales history from CSV files to populate the forecasting engine.
4.  **4.0 Analyze Demand & Inventory**: Uses ARIMA models to predict future demand and calculates Economic Order Quantity (EOQ), Safety Stock, and Reorder Points.
5.  **5.0 Provide Dashboard**: Aggregates data from across the system to provide high-level insights into inventory health and recent activity.

### Data Stores

*   **D1: Products**: Stores static product attributes and current inventory counts.
*   **D2: Sales History**: Contains time-series data of past sales used for forecasting.
*   **D3: Transactions**: Audit log of all stock movements performed in the system.
