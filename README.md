# HRMS - Orchestrator

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/atlas)
[![Contributors](https://img.shields.io/github/contributors/AmanSingh5416/SIH---Orchestrator)](https://github.com/AmanSingh5416/SIH---Orchestrator/graphs/contributors)
[![Issues](https://img.shields.io/github/issues/AmanSingh5416/SIH---Orchestrator)](https://github.com/AmanSingh5416/SIH---Orchestrator/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/AmanSingh5416/SIH---Orchestrator)](https://github.com/AmanSingh5416/SIH---Orchestrator/pulls)

> A comprehensive Human Resource Management System with AI-powered features for employee management, project tracking, and resource optimization.

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Quick Start](#-quick-start)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)
- [Support](#-support)

## 🚀 Features

- **User Authentication**: Secure login/registration with JWT tokens
- **Role-Based Access**: Manager and Employee roles with different permissions
- **Project Management**: Track projects, assign tasks, and monitor progress
- **AI Assistant**: Intelligent assistant for HR-related queries and recommendations
- **Dashboard**: Personalized dashboard with calendar, projects, and user info
- **Resource Optimization**: AI-powered resource allocation and team management

## � Demo

> **Note**: Live demo coming soon! For now, you can run the project locally using the quick start guide below.

### Screenshots

| Dashboard | Project Analysis | AI Assistant |
|-----------|------------------|--------------|
| ![Dashboard](https://via.placeholder.com/300x200?text=Dashboard) | ![Analysis](https://via.placeholder.com/300x200?text=Project+Analysis) | ![AI](https://via.placeholder.com/300x200?text=AI+Assistant) |

## ⚡ Quick Start

Get the project running in under 5 minutes:

```bash
# Clone the repository
git clone https://github.com/AmanSingh5416/SIH---Orchestrator.git
cd SIH---Orchestrator

# Install dependencies and setup project
npm run setup

# Start development servers
npm run dev
--

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## �🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM (MongoDB Atlas cloud database)
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests
- **dotenv** for environment variables

### Frontend
- **HTML5/CSS3/JavaScript** (Vanilla)
- **Responsive Design** with modern UI components
- **Centralized API utilities** for backend communication

## 📁 Project Structure

```
HRMS/
├── backend/                    # Backend application
│   ├── controllers/            # Route controllers
│   │   ├── authController.js   # Authentication logic
│   │   ├── userController.js   # User management
│   │   ├── leaveController.js  # Leave management
│   │   └── performanceController.js # Performance tracking
│   ├── models/                 # Database models
│   │   ├── User.js            # User schema with AI fields
│   │   ├── Leave.js           # Leave management schema
│   │   └── Performance.js     # Performance tracking schema
│   ├── routes/                 # API routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User management routes
│   │   ├── leaves.js          # Leave management routes
│   │   └── performance.js     # Performance tracking routes
│   ├── middleware/             # Custom middleware
│   │   └── authMiddleware.js   # JWT authentication middleware
│   ├── config/                 # Configuration files
│   │   └── database.js         # Database connection
│   ├── .env                    # Environment variables
│   ├── .gitignore             # Git ignore file
│   ├── package.json           # Backend dependencies
│   └── server.js              # Main server file
├── frontend/                   # Frontend application
│   ├── index.html             # Main entry point
│   ├── pages/                 # Application pages
│   │   ├── home page.html     # Landing page
│   │   ├── login.html         # Authentication page
│   │   ├── dashboard.html     # Main dashboard
│   │   ├── [removed] ai-assistant.html  # Assistant is now embedded in dashboard
│   │   ├── project_analysis_leader.html # Team leader view
│   │   └── project_analysis_member.html # Team member view
│   ├── assets/                # Static assets
│   │   ├── js/                # JavaScript files
│   │   │   └── app.js         # Core API and auth utilities
│   │   ├── css/               # Stylesheets
│   │   └── images/            # Images and icons
│   ├── components/            # Reusable UI components
│   │   ├── navigation.js      # Navigation component
│   │   ├── sidebar.js         # Sidebar component
│   │   └── form.js            # Form validation component
│   └── README.md              # Frontend documentation
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🔧 Installation

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (v6 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AmanSingh5416/SIH---Orchestrator.git
   cd SIH---Orchestrator
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example backend/.env
   ```
   
   Edit `backend/.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start individually
   npm run start:backend  # Backend only
   npm run start:frontend # Frontend only
   ```

### Alternative Setup Methods

#### Using the Setup Scripts

**Windows:**
```cmd
setup.bat
```

**Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

#### Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

**Backend Setup:**
```bash
cd backend
npm install
# Configure .env file
npm start
```

**Frontend Setup:**
```bash
cd frontend
# Serve using your preferred method
npx serve .
# OR
python -m http.server 8000
# OR use Live Server extension in VS Code
```

</details>

## 🔧 Setup and Installation

### Prerequisites
- **Node.js** (v14 or higher)
- **MongoDB Atlas** account (or local MongoDB installation)
- **Git** for version control

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

4. **Start the backend server**:
   ```bash
   npm start
   ```
   Or for development (with nodemon):
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Configure API endpoints**:
   Update `assets/js/app.js` with your backend URL:
   ```javascript
   const API_CONFIG = {
     BASE_URL: 'http://localhost:5000/api' // Your backend URL
   };
   ```

3. **Serve frontend files**:
   ```bash
   # Using Node.js
   npx serve .
   
   # Using Python
   python -m http.server 8000
   
   # Using Live Server (VS Code)
   # Right-click index.html -> "Open with Live Server"
   ```

4. **Access the application**:
   - **Main Entry**: `http://localhost:8000/`
   - **Direct Access**: `http://localhost:8000/pages/[page-name].html`

## 👥 User Roles and Permissions

### Manager Role
- Access to team leader project analysis
- Can assign tasks to team members
- View all employee data and project progress
- Access to AI assistant with management insights

### Employee Role
- Access to member project analysis
- View assigned tasks and mark them complete
- Update personal work information
- Access to AI assistant with employee-focused features

## 🔐 Authentication Flow

1. **Registration**: Users can register with name, email, and password
2. **Login**: Supports login with either name or email
3. **JWT Tokens**: Secure token-based authentication
4. **Role Assignment**: Automatic role assignment during registration
5. **Protected Routes**: Frontend pages require authentication

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['employee', 'manager']),
  employeeID: String (auto-generated),
  personalInfo: {
    phone: String,
    address: String,
    dateOfBirth: Date,
    emergencyContact: String
  },
  workInfo: {
    department: String,
    position: String,
    skills: [String],
    experienceLevel: String (enum),
    currentProject: String,
    capacityHours: Number,
    location: String
  }
}
```

## 🤖 AI Integration

The system includes AI-powered features:
- **Resource Optimization**: Intelligent task assignment based on employee skills
- **Smart Scheduling**: AI-assisted project timeline management
- **Performance Insights**: Data-driven performance recommendations
- **Conversational Assistant**: Natural language HR queries and responses

## � Usage

### For Employees
1. **Register/Login** to access your dashboard
2. **View assigned tasks** in project analysis
3. **Mark tasks complete** and track progress
4. **Use AI assistant** for work-related queries

### For Managers
1. **Access team leader dashboard** with management tools
2. **Assign tasks** to team members
3. **Monitor project progress** and team performance
4. **Use AI insights** for resource optimization

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Backend development mode
npm run start:frontend   # Serve frontend files

# Production
npm run start:backend    # Start backend server

# Setup
npm run setup           # Complete project setup
npm run install:all     # Install all dependencies
```

## �🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users` - Get all users (manager only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:id` - Update leave request

### Performance
- `GET /api/performance` - Get performance data
- `POST /api/performance` - Create performance record

## 🔒 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Stateless token-based auth
- **Environment Variables**: Sensitive data protection
- **CORS Configuration**: Cross-origin request security
- **Input Validation**: Server-side validation for all inputs

## 🌐 Frontend Features

### Centralized API Management
- **API Object**: Unified HTTP request handling
- **Auth Object**: Authentication state management
- **UI Object**: Consistent notification system
- **Navigation Object**: Secure route navigation

### Responsive Design
- Mobile-first approach
- Modern CSS with flexbox/grid
- Interactive UI components
- Real-time updates

## 📱 Usage Examples

### Employee Workflow
1. Login to the system
2. View dashboard with assigned projects
3. Check task assignments in project analysis
4. Mark tasks as complete
5. Use AI assistant for work-related queries

### Manager Workflow
1. Login with manager credentials
2. Access team leader dashboard
3. Assign tasks to team members
4. Monitor project progress
5. Use AI for resource optimization insights

## 🔄 Development Workflow

1. **Backend Development**:
   ```bash
   cd backend
   npm run dev  # Start with nodemon
   ```

2. **Frontend Development**:
   ```bash
   cd frontend
   npx serve .  # Serve frontend files
   # Or use Live Server extension in VS Code
   ```

3. **Database Management**:
   - Use MongoDB Compass for visual database management
   - Monitor through MongoDB Atlas dashboard

## 🏗️ Architecture Overview

### Frontend Architecture
- **Component-Based**: Modular UI components for reusability
- **Separation of Concerns**: Pages, assets, and components organized separately
- **Centralized API**: Single source for all backend communication
- **Authentication Flow**: Token-based with automatic session management

### Backend Architecture
- **MVC Pattern**: Models, Views (API responses), Controllers
- **Middleware Chain**: Authentication, validation, error handling
- **Database Layer**: MongoDB with Mongoose ODM
- **RESTful API**: Standard HTTP methods and status codes

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Check MongoDB Atlas IP whitelist
   - Verify connection string in `.env`
   - Ensure network access is configured

2. **CORS Errors**:
   - Verify backend CORS configuration
   - Check frontend API base URL

3. **Authentication Issues**:
   - Clear browser localStorage
   - Check JWT token expiration
   - Verify backend auth middleware

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before getting started.

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See our [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔒 Security

Security is a top priority. Please review our [Security Policy](SECURITY.md) for:
- Reporting vulnerabilities
- Security best practices
- Supported versions

**Never** commit sensitive information like API keys or passwords.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Getting Help
- 📖 **Documentation**: Check this README and [CONTRIBUTING.md](CONTRIBUTING.md)
- 🐛 **Bug Reports**: [Create an issue](https://github.com/AmanSingh5416/SIH---Orchestrator/issues)
- 💡 **Feature Requests**: [Open a discussion](https://github.com/AmanSingh5416/SIH---Orchestrator/discussions)
- 🔒 **Security Issues**: See [SECURITY.md](SECURITY.md)

### Community
- ⭐ **Star** this repository if you find it helpful
- 🐛 **Report bugs** and help improve the project
- 💡 **Suggest features** and enhancements
- 🤝 **Contribute code** and documentation

### Project Maintainers
- **Aman Singh** - [@AmanSingh5416](https://github.com/AmanSingh5416)


<div align="center">

**Made with ❤️ for the developer community**

[⬆ Back to Top](#hrms---orchestrator)

</div>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License -  see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Note**: This is a complete HRMS system with both frontend and backend components. Make sure to set up both parts for full functionality.
