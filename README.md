# 🚀 CMCMIS - Calibration & Maintenance Computerized Management Information System

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![Express](https://img.shields.io/badge/Framework-Express-black)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1)
![JWT](https://img.shields.io/badge/Auth-JWT-green)

## 📌 Overview

CMCMIS (Calibration & Maintenance Computerized Management Information System) is a full-stack enterprise web application developed to digitize the complete lifecycle of laboratory equipment calibration, maintenance, and repair operations.

The system replaces manual paperwork with a centralized digital platform that manages equipment registration, job requests, maintenance workflows, calibration certificates, procurement, scheduling, reporting, analytics, and audit logging.

---

# ✨ Features

## 🔐 Authentication & Security

- JWT Authentication
- Refresh Token Rotation
- Secure Password Hashing
- Role-Based Access Control (RBAC)
- Session Management
- Route Protection
- Login Audit
- Permission-based APIs

---

## 👥 User Management

- Employee Management
- User Account Management
- Role Assignment
- User Activation / Deactivation
- Force Logout
- Lane Based Access Control

---

## 🖥 Equipment Management

- Equipment Registration
- Equipment Verification
- Equipment Search
- Calibration Due Tracking
- Equipment History
- Equipment Condemnation
- PDF Export

---

## 📄 Job Request Management

- Create Job Requests
- Draft Support
- Approval Workflow
- Reject Workflow
- Convert to Job Card
- Job Request History
- PDF Generation

---

## 🔧 Job Card Management

Supports

- Calibration
- Maintenance
- Repair

Features include

- Start Work
- Complete Job
- Verification
- Close Job
- Reopen Job
- Attach Documents
- Checklist Management
- Spare Parts Tracking

---

## 📑 Certificate Generation

Automatically generates

- Calibration Certificates
- NABL Certificates
- Non-NABL Certificates
- Job Closing Reports
- Job Request Forms
- Job Card Reports

---

## 📅 Scheduling

- Calendar View
- Activity Scheduling
- ICS Export
- Schedule Status Tracking

---

## 📦 Procurement

- Purchase Orders
- Spare Parts Inventory
- Reorder Management

---

## 📊 Reports & Analytics

Reports

- Calibration Due
- Pending Jobs
- Engineer Summary
- Equipment Utilization
- Job Card Summary
- Job Request Summary

Analytics

- Dashboard KPIs
- CSV Export
- Dynamic Analytics
- Lab Capacity Analytics

---

## 🔔 Notifications

- In-App Notifications
- Read / Unread Status
- Notification Counter

---

## 📝 Audit System

- Complete Audit Trail
- Change History
- Export Audit Logs
- Field-Level Tracking

---

# 🏗 System Architecture

```
                React + Vite
                      │
                      │ REST API
                      ▼
              Node.js + Express
                      │
      ┌───────────────┼────────────────┐
      │               │                │
 Authentication   Business Logic   PDF Generation
      │               │                │
      └───────────────┼────────────────┘
                      │
                   MySQL
```

---

# 🛠 Tech Stack

## Frontend

- React 18
- Vite
- React Router
- Tailwind CSS
- Axios
- React Query
- Zustand
- React Hook Form
- Zod
- Recharts

---

## Backend

- Node.js
- Express.js
- MySQL2
- JWT
- bcrypt
- Multer
- PDFKit
- Helmet
- CORS
- Rate Limiter
- Cookie Parser

---

## Database

- MySQL

---

# 📂 Project Structure

```
CMCMIS/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── config/
│   │
│   ├── storage/
│   └── package.json
│
├── database/
│   └── migrations/
│
└── README.md
```

---

# 🔑 User Roles

| Role | Permissions |
|-------|-------------|
| Super Admin | Full System Access |
| Lab In-Charge | Job Approval, Verification |
| Lab Engineer | Execute Maintenance & Calibration |
| Normal User | Raise Job Requests |
| View Only | Read-Only Access |

---

# 📸 Modules

- Authentication
- Dashboard
- Equipment
- Job Requests
- Job Cards
- Employees
- Procurement
- Scheduling
- Reports
- Analytics
- Notifications
- Inquiry
- Audit Logs
- Projects
- Tasks
- Checklists

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/cmcmis.git

cd cmcmis
```

---

## Backend

```bash
cd backend

npm install
```

Create `.env`

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=cmcmis

JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

Run Backend

```bash
npm run dev
```

---

## Frontend

```bash
cd frontend

npm install
```

Create `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

Run

```bash
npm run dev
```

---

# 🚀 Production Deployment

Frontend

- Vercel
- Netlify
- Nginx

Backend

- Render
- Railway
- AWS EC2
- DigitalOcean
- VPS

Database

- MySQL
- AWS RDS

---

# 🔒 Security Features

- JWT Authentication
- Refresh Tokens
- Password Hashing
- Role-Based Authorization
- Input Validation
- Helmet Security
- CORS Protection
- Rate Limiting
- Audit Logging

---

# 📈 Future Improvements

- Docker Support
- Kubernetes Deployment
- Email Notifications
- SMS Alerts
- Mobile Application
- IoT Integration
- Multi-Language Support

---

# 🤝 Contributing

1. Fork the repository

2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Added feature"
```

4. Push

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# 📄 License

This project is intended for educational and research purposes.

---

# 👨‍💻 Developed By

**Deep Patel**

Full Stack Developer

- React.js
- Node.js
- Express.js
- MySQL
- MongoDB
- Tailwind CSS

---

⭐ If you like this project, don't forget to star the repository!
