# How to Run the Project

## Quick Start Commands

### Option 1: Using Scripts (Easiest)

**Terminal 1 - Backend:**
```bash
cd /Users/nirajankc/Desktop/courier_finder/fastapi-template
./start_backend.sh
```

**Terminal 2 - Frontend:**
```bash
cd /Users/nirajankc/Desktop/courier_finder/fastapi-template
./start_frontend.sh
```

### Option 2: Manual Commands

**Terminal 1 - Backend:**
```bash
cd /Users/nirajankc/Desktop/courier_finder/fastapi-template
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/nirajankc/Desktop/courier_finder/fastapi-template/frontend
npm run dev
```

## Access URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## Notes

- Make sure you have activated the virtual environment before running the backend
- The `.env` file should contain your `GEMINI_API_KEY` for AI features to work
- Both servers support hot-reload, so changes will automatically refresh

