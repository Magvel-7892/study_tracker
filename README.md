# ClassTrack — Student-Teacher Progress Tracker

A simple, free website for tracking student progress, hosted on GitHub Pages with Firebase as the backend.

**Features:**
- Teacher can post announcements, notes, tasks, and quizzes
- Students can view content, complete tasks, take quizzes, submit daily progress, and ask questions
- Teacher can view all student progress and reply to questions
- Simple username + password authentication
- Works entirely on GitHub Pages (free hosting)

---

## Setup Instructions (One-Time)

### Step 1: Create a Firebase Project (Free)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Enter a project name (e.g., `classtrack`) and click Continue
4. Disable Google Analytics (not needed) and click **Create Project**
5. Wait for it to finish, then click **Continue**

### Step 2: Enable Authentication

1. In the Firebase console sidebar, click **Build → Authentication**
2. Click **"Get started"**
3. Under "Sign-in method", click **Email/Password**
4. Toggle **Enable** to ON, then click **Save**

### Step 3: Create Firestore Database

1. In the sidebar, click **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select a location close to you, then click **Enable**

### Step 4: Create Firestore Indexes

The app uses compound queries that require indexes. Firestore will auto-prompt you to create them, but you can also add them manually:

1. In Firestore, go to the **Indexes** tab
2. Click **"Add Index"** and create these (Collection → Fields → Query scope: Collection):

| Collection    | Field 1 (Ascending) | Field 2 (Descending) |
|--------------|---------------------|---------------------|
| `posts`      | `type`              | `createdAt`         |
| `submissions`| `type`              | `createdAt`         |
| `submissions`| `studentId`, `type` | `createdAt`         |

**Tip:** You can also just use the app and click the index creation links that appear in the browser console errors — Firebase provides direct links.

### Step 5: Get Your Firebase Config

1. In the Firebase console, click the **gear icon** (⚙️) → **Project settings**
2. Scroll down to "Your apps" and click the **Web icon** (`</>`)
3. Enter an app nickname (e.g., `classtrack-web`), click **Register app**
4. You'll see a `firebaseConfig` object — copy the values

### Step 6: Update the Config in `app.js`

Open `app.js` and replace the placeholder config at the top:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // your actual values
  authDomain: "classtrack-xxxxx.firebaseapp.com",
  projectId: "classtrack-xxxxx",
  storageBucket: "classtrack-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 7: (Optional) Change the Teacher Code

In `app.js`, change this line to any secret code you prefer:

```javascript
const TEACHER_CODE = 'TEACHER2024';
```

Only share this code with yourself. Students leave the field blank when registering.

---

## Deploy to GitHub Pages (Free)

### Step 1: Create a GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)
2. Name it `student-tracker` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

### Step 2: Upload Files

**Option A — Upload via GitHub web interface (easiest):**
1. On your new repo page, click **"uploading an existing file"**
2. Drag and drop all 4 files: `index.html`, `style.css`, `app.js`, `README.md`
3. Click **"Commit changes"**

**Option B — Using Git:**
```bash
cd student-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/student-tracker.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**
6. Wait 1–2 minutes, then your site will be live at:
   `https://YOUR_USERNAME.github.io/student-tracker/`

---

## How to Use

### Teacher Registration
1. Go to your site URL
2. Click "Register"
3. Enter a username, your full name, a password
4. Enter the teacher code (default: `TEACHER2024`)
5. Click "Create Account"

### Student Registration
1. Share the site URL with your students
2. Students click "Register"
3. They enter a username, full name, and password
4. Leave the "Teacher Code" field **blank**
5. Click "Create Account"

### Teacher Features
- **Announcements** — Post updates for the whole class
- **Notes** — Share study materials and lecture notes
- **Tasks** — Create assignments with optional due dates
- **Quizzes** — Build multiple-choice quizzes (auto-graded)
- **Student Progress** — View daily progress submissions from all students
- **Questions** — Read and reply to student questions

### Student Features
- **Announcements** — View class announcements
- **Notes** — Read study notes posted by teacher
- **Tasks** — View tasks and mark them as completed
- **Quizzes** — Take quizzes and see scores
- **My Progress** — Submit daily progress updates
- **Ask a Question** — Send questions to the teacher

---

## Securing Your Database (Recommended)

After setup, go to **Firestore → Rules** and replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    match /submissions/{subId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

This ensures:
- Only logged-in users can read data
- Only the teacher can create/delete posts
- Any logged-in user can create submissions
- Only the teacher can update submissions (for replies)

---

## Cost

Everything is **free** within Firebase's Spark (free) plan:
- 1 GB Firestore storage
- 50,000 reads / 20,000 writes per day
- Unlimited authentication users

For 1 teacher + 5 students, you'll never hit these limits.
