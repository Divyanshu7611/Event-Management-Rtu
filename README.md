# Event Management System - RTU Kota

A comprehensive QR-based attendance tracking and event management system for Rajasthan Technical University (RTU) Kota. This system streamlines event registration, attendance tracking, Dashboard and communication for various university events and activities.

---
## 🚀 Features

### 📝 **Registration & Management**
- **Student Registration**: Complete student profile registration with academic details, including branch, year, and domains of interest.
- **Admin Authentication**: Secure login and session management for the core team.
- **Event Management**: Admins can create, view, and delete events directly from their dashboard.

### 📱 **QR Code System**
- **Unique QR Codes**: Automatically generate a unique QR code for each registered student.
- **Real-time Scanning**: Use a webcam to scan QR codes and mark attendance instantly.
- **Instant Feedback**: Get immediate success or error messages upon scanning a QR code.

### 📊 **Dashboard & Data**
- **Admin Dashboard**: A central hub showing key statistics like total students and today's attendance rate.
- **Student Dashboard**: A personal dashboard for students to view their QR code and check their complete attendance history.
- **Data Export**: Admins can download a complete list of registered students and their details as an Excel sheet.

### 📧 **Communication**
- **Automated Emails**: Send automatic registration confirmations and attendance notifications.
- **Bulk Reminders**: Admins can send reminder emails for an event to all registered students with a single click.
- **Recruiter Invitations**: A dedicated page to send professional placement drive invitations to recruiters, with a brochure attached.

---
## 🛠 Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: JWT & Server Actions
- **QR Code**: `html5-qrcode`, `qrcode.react`
- **Email**: Nodemailer
- **Data Export**: `exceljs`

---
## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local instance or a cloud service like MongoDB Atlas)
- npm or yarn

### Installation
1.  **Clone the repository**
    ```bash
    git clone [https://github.com/iamshubh29/Minor-Project_Event-Management-System.git](https://github.com/iamshubh29/Minor-Project_Event-Management-System.git)
    cd Minor-Project_Event-Management-System
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up environment variables**
    Create a `.env.local` file in the root of your project and add the following variables:
    ```env
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_super_secret_key_for_jwt
    EMAIL_USER=your_gmail_address@gmail.com
    EMAIL_PASS=your_gmail_app_password
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Open your browser**
    Navigate to [http://localhost:3000](http://localhost:3000).

---
## 🎯 Key Pages

### **Public Pages**
- `/` - Landing page with RTU branding.
- `/student-register` - Student event registration.
- `/login` - Admin login page.

### **Student Pages**
- `/student-dashboard` - Student personal dashboard with QR code and attendance history.

### **Admin Pages**
- `/admin/scanner` - Core team dashboard, QR code scanner, and event management.
- `/admin/scanner/review` - Student review and data management.
- `/send-mail` - Email invitation system for recruiters.

### **Utility Pages**
- `/scan/[userId]` - QR code scanning endpoint for marking attendance.
- `/Student-Attendance` - A dedicated scanning page for student volunteers.

---
## 🤝 Contributing

Contributions are welcome! Please follow these steps to contribute:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---
## 📄 License

This project is licensed under the MIT License. Please create a `LICENSE` file in the root of the project if one does not exist.
