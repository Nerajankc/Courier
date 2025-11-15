# Courier Finder

A full-stack application for finding lost products using AI-powered matching. Built with FastAPI (backend) and React (frontend).

## Features

- **Two User Types:**
  - **Courier Users**: Upload found products with images and descriptions
  - **Find Users**: Search for lost products using AI-powered matching

- **AI Integration:**
  - Automatic product description generation using Google Gemini Vision API
  - Intelligent product matching using Gemini AI for search queries

- **Authentication:**
  - JWT-based authentication
  - Role-based access control (courier vs find users)

## Tech Stack

### Backend
- FastAPI
- SQLite
- SQLAlchemy
- JWT Authentication
- Google Gemini API

### Frontend
- React
- Vite
- React Router
- Axios

## Setup Instructions

### Backend Setup

1. Navigate to the project directory:
```bash
cd fastapi-template
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
SECRET_KEY=your-secret-key-here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

5. Run the backend server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### For Courier Users:

1. Register/Login with user type "Courier"
2. Upload product images with descriptions
3. AI automatically generates detailed product descriptions
4. Products are stored and made searchable

### For Find Users:

1. Register/Login with user type "Find"
2. Enter a detailed description of your lost product
3. AI matches your description with available products
4. View matching products with match scores

## API Endpoints

### Authentication
- `POST /users/register` - Register a new user
- `POST /users/login` - Login and get JWT token
- `GET /users/me` - Get current user info

### Courier Operations
- `POST /couriers/upload` - Upload a product (requires courier role)
- `GET /couriers/my-products` - Get my uploaded products
- `GET /couriers/products/{product_id}` - Get product details

### Search Operations
- `POST /requests/search` - Search for products (requires find role)
- `POST /requests/create` - Create a search request
- `GET /requests/my-requests` - Get my search requests

## Database Schema

- **Users**: User accounts with type (find/courier)
- **CourierData**: Products uploaded by courier users
- **UserRequest**: Search requests by find users

## Project Structure

```
fastapi-template/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── database.py      # Database configuration
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # Authentication utilities
│   ├── gemini_service.py # Gemini AI integration
│   └── routers/         # API routes
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   ├── utils/       # API utilities
│   │   └── App.js       # Main app component
│   └── package.json
├── uploads/             # Uploaded product images
└── courier_finder.db    # SQLite database (auto-created)
```

## Notes

- The database is automatically created on first run
- Product images are stored in the `uploads/` directory
- Gemini API key is required for AI features (falls back to keyword matching if not configured)

## License

MIT
