# Syfer Password Manager

This is a web-based password manager project.

## Features
- User login and registration
- Store encrypted passwords
- View, edit, and delete passwords
- Search and organize by category

## Technologies
- Frontend: HTML, CSS, React
- Backend: Node.js, Express
- Database: MySQL

## Database
See schema.sql for database structure.

## Project Structure
- backend: Express API with session auth and encrypted vault storage
- frontend: React + Vite client app

## Run Backend
1. Open a terminal in backend
2. Install packages:
	npm install
3. Start server:
	node index.js

Backend runs at http://localhost:3001

## Run Frontend
1. Open a terminal in frontend
2. Install packages:
	npm install
3. Start dev server:
	npm run dev

Frontend runs at http://localhost:5173

## Implemented Frontend Features
- Register and login with session-based authentication
- Add, list, edit, search, and filter vault entries by category
- Delete vault entries
