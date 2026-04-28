# Security Guard Management System

A comprehensive web-based security guard management system with real-time attendance tracking, hierarchical user management, and chat functionality.

## Features

- 👥 **User Management**: Owner, Manager, Supervisor, and Guard roles
- 📸 **Attendance System**: Photo-based attendance with verification
- 💬 **Real-time Chat**: Personal and group messaging
- 📊 **Analytics Dashboard**: Attendance reports and statistics
- 🔐 **Document Management**: Upload and verify guard documents
- 🌳 **Hierarchy Management**: Organize users in hierarchical structure

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Real-time**: Socket.io
- **File Upload**: Multer

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd security-guard-management
```

2. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Create `.env` file in root:
```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

4. Start the application:
```bash
# Development mode (runs both server and client)
npm run dev

# Production mode
npm start
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Login Credentials

**Owner Account:**
- User ID: `2026`
- Password: `owner123`

## Deployment

### Deploy to Render

1. Push code to GitHub
2. Connect your GitHub repo to Render
3. Set environment variables in Render dashboard
4. Deploy!

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## Project Structure

```
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       ├── context/       # React context
│       └── utils/         # Utility functions
├── server/                # Node.js backend
│   ├── database/         # Database setup
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   └── utils/            # Utility functions
├── uploads/              # File uploads directory
└── package.json          # Dependencies

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/hierarchy` - Get user hierarchy
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/my` - Get my attendance
- `POST /api/attendance/verify/:id` - Verify attendance
- `POST /api/attendance/reject/:id` - Reject attendance

### Chat
- `GET /api/chat/conversations` - Get conversations
- `POST /api/chat/message` - Send message
- `GET /api/chat/messages/:id` - Get messages

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
