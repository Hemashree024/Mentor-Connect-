# 👥 Mentor-Mentee Platform

A web-based application designed to connect mentees with suitable mentors for guidance in career, skills development, and personal growth. Built using Node.js for the backend and a web frontend with file upload support.

---

## 📁 Project Structure

```
Mentor mentee/
├── index.js                 # Main backend application file (Express server)
├── package.json             # Project dependencies and scripts
├── package-lock.json        # Dependency lock file
├── public/                  # Static frontend assets (HTML, CSS, JS)
├── uploads/                 # Uploaded files directory
├── thumbnail.png.png        # Project preview image
└── node_modules/            # Installed dependencies
```

---

## 🚀 Features

- 🧑‍🏫 Mentor & mentee registration and login
- 🗂️ Profile management for both mentors and mentees
- 📤 File upload support (e.g., profile pictures, documents)
- 📅 Availability scheduling


---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

---

## 🔧 Installation & Setup

```bash
git clone https://github.com/your-username/mentor-mentee-app.git
cd "Mentor mentee"
npm install
```

---

## 💻 Running the Application

```bash
node index.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Development Notes

- Ensure the `uploads/` directory exists and is writable
- Static files are served from the `public/` directory
- Add `.env` file if using environment variables for configuration

---



## 📜 License

This project is licensed under the MIT License.
