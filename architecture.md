# BarberEase – Project Architecture & Design Documentation

BarberEase is a real-time full-stack web application for barber shops/salons to manage physical chairs, digital booking appointments, and waiting queues. It uses a structured Model-View-Controller (MVC) layered architecture built on Node.js/Express, MySQL (via Sequelize ORM), and Socket.IO for real-time status updates.

---

## 🏛️ High-Level System Architecture

The following diagram illustrates the overall system components, network protocols, and data layers:

```mermaid
graph TD
    subgraph Client ["Client Presentation Layer (Browser)"]
        CA["Customer Dashboard JS"]
        AA["Admin Dashboard JS"]
        SC["Socket.IO Client"]
    end

    subgraph Security ["Security & Networking"]
        HL["Helmet Security Headers"]
        RL["Express Rate Limiter"]
        CORS["CORS Middleware"]
    end

    subgraph Server ["Backend Application Layer (Node.js & Express)"]
        R["Express Router (routes/)"]
        M["Middleware (middleware/)"]
        C["Controllers (controllers/)"]
        S["Services (services/)"]
        BC["Background Reservation Cleaner"]
    end

    subgraph Database ["Data Access & Storage"]
        SQ["Sequelize ORM Models (models/)"]
        DB[(MySQL Database)]
    end

    %% Client communication
    CA -->|HTTP Requests| HL
    AA -->|HTTP Requests| HL
    SC <-->|WebSocket Events| Server

    %% Middleware flow
    HL --> RL
    RL --> CORS
    CORS --> R

    %% Express inner flow
    R --> M
    M --> C
    C --> S
    S --> SQ
    SQ <--> DB

    %% Background task & sockets
    BC -->|Checks & Cleans| S
    S -->|Triggers updates via| Server
```

---

## 🗃️ Database ER Diagram (Sequelize Models)

The MySQL database schema is mapped using Sequelize ORM. The entities represent customers, admins, physical chairs, salon services, digital appointments, virtual queues, and validation/confirmation tokens.

```mermaid
erDiagram
    Admin {
        int id PK
        string username
        string password
    }

    Customer {
        int id PK
        string name
        string email
        string password
        string phone
    }

    Service {
        int id PK
        string name
        decimal price
        int duration_minutes
    }

    Chair {
        int id PK
        string name
        string status
        int reserved_by FK
        datetime reservation_expires_at
    }

    Appointment {
        int id PK
        int customer_id FK
        int service_id FK
        int chair_id FK
        datetime appointment_time
        string status
    }

    Queue {
        int id PK
        int customer_id FK
        int service_id FK
        int position
        string status
    }

    Token {
        int id PK
        string token_number
        int customer_id FK
        int appointment_id FK
        int queue_id FK
        string type
        string status
    }

    %% Relationships
    Customer ||--o{ Appointment : "has many"
    Customer ||--o{ Queue : "has many"
    Customer ||--o{ Token : "has many"
    Customer ||--o| Chair : "reserves"

    Service ||--o{ Appointment : "has many"
    Service ||--o{ Queue : "has many"

    Chair ||--o{ Appointment : "has many"

    Appointment ||--o| Token : "has one"
    Queue ||--o| Token : "has one"
```

---

## 🔄 Real-Time Event Flow

BarberEase utilizes Socket.IO to enable real-time synchronization between the database state and client interfaces. For example, when a chair is reserved or updated, all connected clients receive updates immediately.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Client)
    participant Server as Express Server
    participant DB as MySQL DB
    participant Socket as Socket.IO (Server)
    actor Admin as Admin Dashboard

    %% Chair Reservation Event
    Customer->>Server: PUT /api/chairs/:id/reserve (Auth Header)
    Server->>DB: Check availability & set reservation hold
    DB-->>Server: Hold successful (5 min timer)
    Server->>Socket: Emit "chair-update" event
    Socket-->>Customer: Broadcast "chair-update" to all users
    Socket-->>Admin: Broadcast "chair-update" to admin
    Server-->>Customer: Return success response (starts client timer)

    %% Timeout Cleaner Process (Runs every 15s)
    Note over Server, DB: Background Reservation Cleaner loops
    Server->>DB: Scan for expired reservations
    DB-->>Server: Found and cleared expired reservation(s)
    Server->>Socket: Emit "chair-update" (Expired holds released)
    Socket-->>Customer: Update chair status to Available (Green)
```

---

## 📦 File Architecture & Code Structure

The project directory structure is designed to separate concerns cleanly:

### 1. Entry Point
* [server.js](file:///c:/BarberEase/server.js): Initializes the HTTP and Socket.IO servers, configures security middlewares, registers REST routes, and runs the background cleaning loop for chair reservations.

### 2. Configuration & Utilities
* [config/app.js](file:///c:/BarberEase/config/app.js): Loads and structuralizes configuration variables from `.env`.
* [config/database.js](file:///c:/BarberEase/config/database.js): Connects to MySQL database using Sequelize ORM.
* [utils/helpers.js](file:///c:/BarberEase/utils/helpers.js): Helper utilities such as queue token generation and waiting-time calculations.

### 3. Middleware Layer
* [middleware/auth.js](file:///c:/BarberEase/middleware/auth.js): Decodes and validates JWT tokens from incoming request headers, attaching the user payload to `req.user`.
* [middleware/roleGuard.js](file:///c:/BarberEase/middleware/roleGuard.js): Limits access to routes based on user roles (`super_admin`, `admin`, `customer`).
* [middleware/asyncWrapper.js](file:///c:/BarberEase/middleware/asyncWrapper.js): Catches exceptions in async controller routes and forwards them to the error handler.
* [middleware/errorHandler.js](file:///c:/BarberEase/middleware/errorHandler.js): Parses syntax/database errors and outputs consistent JSON error responses.

### 4. Routing Layer
Defines URL paths and hooks them up to validation middlewares and controller handlers:
* [routes/auth.routes.js](file:///c:/BarberEase/routes/auth.routes.js): User & Admin authentication.
* [routes/customer.routes.js](file:///c:/BarberEase/routes/customer.routes.js): Customer management actions.
* [routes/service.routes.js](file:///c:/BarberEase/routes/service.routes.js): Hair salon service configuration.
* [routes/chair.routes.js](file:///c:/BarberEase/routes/chair.routes.js): Chair status monitoring, reserves, and releases.
* [routes/appointment.routes.js](file:///c:/BarberEase/routes/appointment.routes.js): Appointment reservations and seat/complete operations.
* [routes/queue.routes.js](file:///c:/BarberEase/routes/queue.routes.js): Virtual waiting queue check-ins and check-outs.
* [routes/token.routes.js](file:///c:/BarberEase/routes/token.routes.js): Token status verification.
* [routes/report.routes.js](file:///c:/BarberEase/routes/report.routes.js): Metrics and analytics.

### 5. Controller Layer
Coordinates incoming HTTP requests, invokes services, emits Socket.IO updates, and returns JSON payloads:
* [controllers/auth.controller.js](file:///c:/BarberEase/controllers/auth.controller.js)
* [controllers/customer.controller.js](file:///c:/BarberEase/controllers/customer.controller.js)
* [controllers/service.controller.js](file:///c:/BarberEase/controllers/service.controller.js)
* [controllers/chair.controller.js](file:///c:/BarberEase/controllers/chair.controller.js)
* [controllers/appointment.controller.js](file:///c:/BarberEase/controllers/appointment.controller.js)
* [controllers/queue.controller.js](file:///c:/BarberEase/controllers/queue.controller.js)
* [controllers/report.controller.js](file:///c:/BarberEase/controllers/report.controller.js)

### 6. Services (Business Logic) Layer
Encapsulates all database updates, transactional controls, and domain logic rules:
* [services/auth.service.js](file:///c:/BarberEase/services/auth.service.js)
* [services/customer.service.js](file:///c:/BarberEase/services/customer.service.js)
* [services/service.service.js](file:///c:/BarberEase/services/service.service.js)
* [services/chair.service.js](file:///c:/BarberEase/services/chair.service.js)
* [services/appointment.service.js](file:///c:/BarberEase/services/appointment.service.js)
* [services/queue.service.js](file:///c:/BarberEase/services/queue.service.js)
* [services/report.service.js](file:///c:/BarberEase/services/report.service.js)

### 7. Views & Frontend Client
* [views/index.html](file:///c:/BarberEase/views/index.html): Primary landing page view.
* [public/](file:///c:/BarberEase/public): Houses layout stylesheets, assets, and frontend logic scripts utilizing Socket.IO client connections to communicate dynamically with the API server.
