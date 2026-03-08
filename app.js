/* ==========================================================
   ClassTrack — Student-Teacher Progress Tracker
   ========================================================== */

// ===================== CONFIGURATION =====================
// IMPORTANT: Replace the firebaseConfig below with your own.
// See README.md for step-by-step Firebase setup instructions.

const TEACHER_CODE = 'TEACHER2024'; // Change this! Students must NOT know it.
const EMAIL_DOMAIN = '@classtrack.app'; // Used internally — students just type a username.

const firebaseConfig = {

  apiKey: "AIzaSyDP-VUQjcA6T7ixRzQfWL1d7sI1wK_7hd8",

  authDomain: "student-tracker-13091.firebaseapp.com",

  projectId: "student-tracker-13091",

  storageBucket: "student-tracker-13091.firebasestorage.app",

  messagingSenderId: "820536428493",

  appId: "1:820536428493:web:3b75ebf8bb9be96ec5a684",

  measurementId: "G-JWY4E89BPL"

};

// ===================== FIREBASE INIT =====================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===================== GLOBAL STATE =====================
let currentUser = null;
let currentUserData = null;
let currentTab = 'dashboard';
let quizQuestions = [];

// ===================== DOM HELPERS =====================
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// ===================== AUTH =====================
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        currentUserData = doc.data();
        showApp();
      } else {
        await auth.signOut();
        toast('Account data not found. Please register again.', 'error');
        showAuth();
      }
    } catch (e) {
      console.error(e);
      toast('Error loading profile.', 'error');
      showAuth();
    }
  } else {
    currentUser = null;
    currentUserData = null;
    showAuth();
  }
});

function handleLogin(e) {
  e.preventDefault();
  const username = $('login-username').value.trim().toLowerCase();
  const password = $('login-password').value;
  if (!username || !password) return;
  const email = username + EMAIL_DOMAIN;
  auth.signInWithEmailAndPassword(email, password).catch(err => {
    toast(friendlyError(err.code), 'error');
  });
}

function handleRegister(e) {
  e.preventDefault();
  const username = $('reg-username').value.trim().toLowerCase();
  const password = $('reg-password').value;
  const teacherCode = $('reg-teacher-code').value.trim();
  if (!username || !password) return;
  if (password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }

  const role = (teacherCode === TEACHER_CODE) ? 'teacher' : 'student';
  if (teacherCode && teacherCode !== TEACHER_CODE) {
    toast('Invalid teacher code. Leave blank to register as student.', 'error');
    return;
  }

  const email = username + EMAIL_DOMAIN;
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return db.collection('users').doc(cred.user.uid).set({
        username,
        displayName: username,
        role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .catch(err => {
      toast(friendlyError(err.code), 'error');
    });
}

function handleLogout() {
  auth.signOut();
}

function toggleAuthForm(e) {
  if (e) e.preventDefault();
  $('login-form').classList.toggle('hidden');
  $('register-form').classList.toggle('hidden');
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with that username.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'That username is already taken.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Invalid username format.',
    'auth/invalid-credential': 'Incorrect username or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ===================== VIEW MANAGEMENT =====================
function showAuth() {
  hide($('loading'));
  hide($('app-view'));
  show($('auth-view'));
}

function showApp() {
  hide($('loading'));
  hide($('auth-view'));
  show($('app-view'));
  buildSidebar();
  switchTab('dashboard');
}

function toggleSidebar() {
  $('sidebar').classList.toggle('open');
}

// ===================== SIDEBAR =====================
function buildSidebar() {
  const role = currentUserData.role;
  $('user-badge').textContent = `${currentUserData.displayName} (${role})`;

  const teacherLinks = [
    { tab: 'dashboard', icon: '🖥️', label: 'Dashboard' },
    { tab: 'announcements', icon: '📡', label: 'Announcements' },
    { tab: 'notes', icon: '🧠', label: 'Notes' },
    { tab: 'tasks', icon: '⚙️', label: 'Tasks' },
    { tab: 'quizzes', icon: '🧪', label: 'Quizzes' },
    { tab: 'calendar', icon: '📅', label: 'Progress Calendar' },
    { tab: 'progress', icon: '📊', label: 'Progress Feed' },
    { tab: 'questions', icon: '💬', label: 'Questions' }
  ];

  const studentLinks = [
    { tab: 'dashboard', icon: '🖥️', label: 'Dashboard' },
    { tab: 'announcements', icon: '📡', label: 'Announcements' },
    { tab: 'notes', icon: '🧠', label: 'Notes' },
    { tab: 'tasks', icon: '⚙️', label: 'Tasks' },
    { tab: 'quizzes', icon: '🧪', label: 'Quizzes' },
    { tab: 'progress', icon: '📊', label: 'My Progress' },
    { tab: 'calendar', icon: '📅', label: 'Calendar' },
    { tab: 'questions', icon: '💬', label: 'Ask a Question' }
  ];

  const links = role === 'teacher' ? teacherLinks : studentLinks;
  $('nav-links').innerHTML = links.map(l =>
    `<li><a href="#" data-tab="${l.tab}" onclick="switchTab('${l.tab}', event)">
       <span class="nav-icon">${l.icon}</span>${l.label}
     </a></li>`
  ).join('');
}

function switchTab(tab, e) {
  if (e) e.preventDefault();
  currentTab = tab;

  document.querySelectorAll('#nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });

  // Close sidebar on mobile
  $('sidebar').classList.remove('open');

  renderTab(tab);
}

// ===================== TAB RENDERING =====================
function renderTab(tab) {
  const area = $('content-area');
  const role = currentUserData.role;

  const renderers = {
    dashboard: renderDashboard,
    announcements: renderAnnouncements,
    notes: renderNotes,
    tasks: renderTasks,
    quizzes: renderQuizzes,
    progress: role === 'teacher' ? renderTeacherProgress : renderStudentProgress,
    calendar: renderCalendar,
    questions: role === 'teacher' ? renderTeacherQuestions : renderStudentQuestions
  };

  if (renderers[tab]) renderers[tab](area);
}

// ===================== DASHBOARD =====================
async function renderDashboard(area) {
  const role = currentUserData.role;
  area.innerHTML = `
    <div class="page-header">
      <h2>Welcome, ${esc(currentUserData.displayName)}</h2>
      <p>${role === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'}</p>
    </div>
    <div class="stats-grid" id="stats-grid">Loading stats...</div>
    <div class="page-header"><h2>Recent Announcements</h2></div>
    <div id="dash-announcements">Loading...</div>`;

  try {
    const [announcementsSnap, tasksSnap, quizzesSnap] = await Promise.all([
      db.collection('posts').where('type', '==', 'announcement').orderBy('createdAt', 'desc').limit(3).get(),
      db.collection('posts').where('type', '==', 'task').get(),
      db.collection('posts').where('type', '==', 'quiz').get()
    ]);

    let statsHtml = '';
    if (role === 'teacher') {
      const studentsSnap = await db.collection('users').where('role', '==', 'student').get();
      const submissionsSnap = await db.collection('submissions').get();
      statsHtml = `
        <div class="stat-card"><div class="stat-value">${studentsSnap.size}</div><div class="stat-label">Students</div></div>
        <div class="stat-card"><div class="stat-value">${tasksSnap.size}</div><div class="stat-label">Tasks</div></div>
        <div class="stat-card"><div class="stat-value">${quizzesSnap.size}</div><div class="stat-label">Quizzes</div></div>
        <div class="stat-card"><div class="stat-value">${submissionsSnap.size}</div><div class="stat-label">Submissions</div></div>`;
    } else {
      const myProgressSnap = await db.collection('submissions')
        .where('studentId', '==', currentUser.uid).where('type', '==', 'progress').get();
      const myCompletionsSnap = await db.collection('submissions')
        .where('studentId', '==', currentUser.uid).where('type', '==', 'task_completion').get();
      statsHtml = `
        <div class="stat-card"><div class="stat-value">${tasksSnap.size}</div><div class="stat-label">Total Tasks</div></div>
        <div class="stat-card"><div class="stat-value">${myCompletionsSnap.size}</div><div class="stat-label">Tasks Done</div></div>
        <div class="stat-card"><div class="stat-value">${quizzesSnap.size}</div><div class="stat-label">Quizzes</div></div>
        <div class="stat-card"><div class="stat-value">${myProgressSnap.size}</div><div class="stat-label">Progress Updates</div></div>`;
    }
    $('stats-grid').innerHTML = statsHtml;

    let annHtml = '';
    announcementsSnap.forEach(doc => {
      const d = doc.data();
      annHtml += postCard(d, doc.id, false);
    });
    $('dash-announcements').innerHTML = annHtml || emptyState('📢', 'No announcements yet.');
  } catch (e) {
    console.error(e);
    area.innerHTML = `<p>Error loading dashboard.</p>`;
  }
}

// ===================== ANNOUNCEMENTS =====================
async function renderAnnouncements(area) {
  const isTeacher = currentUserData.role === 'teacher';
  area.innerHTML = `
    <div class="page-header"><h2>Announcements</h2><p>General announcements for the class</p></div>
    ${isTeacher ? createFormHtml('announcement', 'New Announcement', [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Announcement title' },
      { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Write your announcement...' }
    ]) : ''}
    <div id="announcements-list">Loading...</div>`;

  loadPosts('announcement', 'announcements-list', isTeacher);
}

// ===================== NOTES =====================
async function renderNotes(area) {
  const isTeacher = currentUserData.role === 'teacher';
  area.innerHTML = `
    <div class="page-header"><h2>Notes</h2><p>Study notes and materials</p></div>
    ${isTeacher ? createFormHtml('note', 'Upload Notes', [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Note title' },
      { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Write or paste your notes here...' }
    ]) : ''}
    <div id="notes-list">Loading...</div>`;

  loadPosts('note', 'notes-list', isTeacher);
}

// ===================== TASKS =====================
async function renderTasks(area) {
  const isTeacher = currentUserData.role === 'teacher';
  area.innerHTML = `
    <div class="page-header"><h2>Tasks</h2><p>${isTeacher ? 'Create and manage tasks' : 'View and complete tasks'}</p></div>
    ${isTeacher ? createFormHtml('task', 'Create Task', [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Task title' },
      { name: 'content', label: 'Description', type: 'textarea', placeholder: 'Describe the task...' },
      { name: 'dueDate', label: 'Due Date (optional)', type: 'date' }
    ]) : ''}
    <div id="tasks-list">Loading...</div>`;

  if (isTeacher) {
    loadPosts('task', 'tasks-list', true);
  } else {
    loadStudentTasks();
  }
}

async function loadStudentTasks() {
  try {
    const [tasksSnap, completionsSnap] = await Promise.all([
      db.collection('posts').where('type', '==', 'task').orderBy('createdAt', 'desc').get(),
      db.collection('submissions').where('studentId', '==', currentUser.uid)
        .where('type', '==', 'task_completion').get()
    ]);

    const completedIds = new Set();
    completionsSnap.forEach(doc => completedIds.add(doc.data().postId));

    let html = '';
    tasksSnap.forEach(doc => {
      const d = doc.data();
      const done = completedIds.has(doc.id);
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="${done ? 'completed-text' : ''}">${esc(d.title)}</h3>
            ${d.dueDate ? `<span class="badge badge-yellow">Due: ${d.dueDate}</span>` : ''}
          </div>
          <div class="card-body ${done ? 'completed-text' : ''}">${esc(d.content)}</div>
          <div class="card-footer">
            ${done
              ? '<span class="badge badge-green">Completed</span>'
              : `<button class="btn btn-success btn-sm" onclick="completeTask('${doc.id}', '${esc(d.title)}')">Mark as Done</button>`
            }
          </div>
        </div>`;
    });
    $('tasks-list').innerHTML = html || emptyState('✅', 'No tasks yet.');
  } catch (e) {
    console.error(e);
    $('tasks-list').innerHTML = '<p>Error loading tasks.</p>';
  }
}

async function completeTask(postId, title) {
  try {
    await db.collection('submissions').add({
      type: 'task_completion',
      postId,
      postTitle: title,
      studentId: currentUser.uid,
      studentName: currentUserData.displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('Task marked as completed!', 'success');
    renderTab('tasks');
  } catch (e) {
    console.error(e);
    toast('Error completing task.', 'error');
  }
}

// ===================== QUIZZES =====================
async function renderQuizzes(area) {
  const isTeacher = currentUserData.role === 'teacher';
  quizQuestions = [];

  area.innerHTML = `
    <div class="page-header"><h2>Quizzes</h2><p>${isTeacher ? 'Create and manage quizzes' : 'Take quizzes'}</p></div>
    ${isTeacher ? `
      <div class="create-form">
        <h3>Create Quiz</h3>
        <div class="form-group">
          <label>Quiz Title</label>
          <input type="text" id="quiz-title" placeholder="Enter quiz title">
        </div>
        <div id="quiz-builder"></div>
        <div class="form-actions">
          <button class="btn btn-outline" onclick="addQuizQuestion()">+ Add Question</button>
          <button class="btn btn-primary" onclick="submitQuiz()">Create Quiz</button>
        </div>
      </div>` : ''}
    <div id="quizzes-list">Loading...</div>`;

  if (isTeacher) {
    loadTeacherQuizzes();
  } else {
    loadStudentQuizzes();
  }
}

function addQuizQuestion() {
  const idx = quizQuestions.length;
  quizQuestions.push({ question: '', options: ['', '', '', ''], correct: 0 });
  renderQuizBuilder();
}

function renderQuizBuilder() {
  $('quiz-builder').innerHTML = quizQuestions.map((q, i) => `
    <div class="quiz-question-block">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h4>Question ${i + 1}</h4>
        <button class="remove-btn" onclick="removeQuizQuestion(${i})">&times;</button>
      </div>
      <div class="form-group">
        <input type="text" value="${esc(q.question)}" placeholder="Enter question"
               onchange="quizQuestions[${i}].question=this.value">
      </div>
      ${q.options.map((opt, j) => `
        <div class="quiz-option">
          <input type="radio" name="correct-${i}" ${q.correct === j ? 'checked' : ''}
                 onchange="quizQuestions[${i}].correct=${j}">
          <input type="text" value="${esc(opt)}" placeholder="Option ${String.fromCharCode(65 + j)}"
                 style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px"
                 onchange="quizQuestions[${i}].options[${j}]=this.value">
        </div>`).join('')}
      <p style="font-size:12px;color:var(--text-secondary);margin-top:6px">Select the radio button next to the correct answer.</p>
    </div>`).join('');
}

function removeQuizQuestion(idx) {
  quizQuestions.splice(idx, 1);
  renderQuizBuilder();
}

async function submitQuiz() {
  const title = $('quiz-title').value.trim();
  if (!title) { toast('Enter a quiz title.', 'error'); return; }
  if (quizQuestions.length === 0) { toast('Add at least one question.', 'error'); return; }

  for (let i = 0; i < quizQuestions.length; i++) {
    const q = quizQuestions[i];
    if (!q.question.trim()) { toast(`Question ${i + 1} is empty.`, 'error'); return; }
    if (q.options.some(o => !o.trim())) { toast(`Fill all options in Question ${i + 1}.`, 'error'); return; }
  }

  try {
    await db.collection('posts').add({
      type: 'quiz',
      title,
      questions: quizQuestions,
      authorId: currentUser.uid,
      authorName: currentUserData.displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('Quiz created!', 'success');
    quizQuestions = [];
    renderTab('quizzes');
  } catch (e) {
    console.error(e);
    toast('Error creating quiz.', 'error');
  }
}

async function loadTeacherQuizzes() {
  try {
    const snap = await db.collection('posts').where('type', '==', 'quiz').orderBy('createdAt', 'desc').get();
    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div class="card">
          <div class="card-header">
            <h3>${esc(d.title)}</h3>
            <span class="badge badge-blue">${d.questions.length} question${d.questions.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="card-meta">${formatDate(d.createdAt)}</div>
          <div class="card-footer">
            <button class="btn btn-sm btn-outline" onclick="viewQuizResults('${doc.id}', '${esc(d.title)}')">View Results</button>
            <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deletePost('${doc.id}')">Delete</button>
          </div>
        </div>`;
    });
    $('quizzes-list').innerHTML = html || emptyState('❓', 'No quizzes yet. Create one above!');
  } catch (e) {
    console.error(e);
    $('quizzes-list').innerHTML = '<p>Error loading quizzes.</p>';
  }
}

async function loadStudentQuizzes() {
  try {
    const [quizSnap, answersSnap] = await Promise.all([
      db.collection('posts').where('type', '==', 'quiz').orderBy('createdAt', 'desc').get(),
      db.collection('submissions').where('studentId', '==', currentUser.uid)
        .where('type', '==', 'quiz_answer').get()
    ]);

    const answeredIds = {};
    answersSnap.forEach(doc => {
      const d = doc.data();
      answeredIds[d.postId] = d;
    });

    let html = '';
    quizSnap.forEach(doc => {
      const d = doc.data();
      const answered = answeredIds[doc.id];
      html += `
        <div class="card">
          <div class="card-header">
            <h3>${esc(d.title)}</h3>
            <span class="badge badge-blue">${d.questions.length} question${d.questions.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="card-meta">${formatDate(d.createdAt)}</div>
          <div class="card-footer">
            ${answered
              ? `<span class="score ${answered.score / d.questions.length >= 0.7 ? 'score-good' : answered.score / d.questions.length >= 0.4 ? 'score-ok' : 'score-low'}">${answered.score}/${d.questions.length}</span> <span class="badge badge-green">Completed</span>`
              : `<button class="btn btn-primary btn-sm" onclick="takeQuiz('${doc.id}')">Take Quiz</button>`
            }
          </div>
        </div>`;
    });
    $('quizzes-list').innerHTML = html || emptyState('❓', 'No quizzes available yet.');
  } catch (e) {
    console.error(e);
    $('quizzes-list').innerHTML = '<p>Error loading quizzes.</p>';
  }
}

async function takeQuiz(quizId) {
  try {
    const doc = await db.collection('posts').doc(quizId).get();
    const data = doc.data();

    let html = `<form id="take-quiz-form">`;
    data.questions.forEach((q, i) => {
      html += `
        <div class="quiz-question-block">
          <h4>${i + 1}. ${esc(q.question)}</h4>
          ${q.options.map((opt, j) => `
            <div class="quiz-option">
              <input type="radio" name="q${i}" value="${j}" id="q${i}o${j}" required>
              <label for="q${i}o${j}">${esc(opt)}</label>
            </div>`).join('')}
        </div>`;
    });
    html += `<button type="submit" class="btn btn-primary btn-full">Submit Answers</button></form>`;

    openModal(data.title, html);

    $('take-quiz-form').onsubmit = async (e) => {
      e.preventDefault();
      let score = 0;
      data.questions.forEach((q, i) => {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected && parseInt(selected.value) === q.correct) score++;
      });

      await db.collection('submissions').add({
        type: 'quiz_answer',
        postId: quizId,
        postTitle: data.title,
        studentId: currentUser.uid,
        studentName: currentUserData.displayName,
        score,
        total: data.questions.length,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      closeModal();
      toast(`You scored ${score}/${data.questions.length}!`, 'success');
      renderTab('quizzes');
    };
  } catch (e) {
    console.error(e);
    toast('Error loading quiz.', 'error');
  }
}

async function viewQuizResults(quizId, title) {
  try {
    const snap = await db.collection('submissions')
      .where('type', '==', 'quiz_answer')
      .where('postId', '==', quizId).get();

    let html = '';
    if (snap.empty) {
      html = '<p style="color:var(--text-secondary);text-align:center;padding:20px">No submissions yet.</p>';
    } else {
      html = '<div>';
      snap.forEach(doc => {
        const d = doc.data();
        const pct = d.score / d.total;
        html += `
          <div class="student-row">
            <span class="student-name">${esc(d.studentName)}</span>
            <span class="score ${pct >= 0.7 ? 'score-good' : pct >= 0.4 ? 'score-ok' : 'score-low'}">${d.score}/${d.total}</span>
          </div>`;
      });
      html += '</div>';
    }
    openModal(`Results: ${title}`, html);
  } catch (e) {
    console.error(e);
    toast('Error loading results.', 'error');
  }
}

// ===================== PROGRESS =====================
async function renderTeacherProgress(area) {
  area.innerHTML = `
    <div class="page-header"><h2>Student Progress</h2><p>View daily progress updates from students</p></div>
    <div id="progress-list">Loading...</div>`;

  try {
    const snap = await db.collection('submissions')
      .where('type', '==', 'progress')
      .orderBy('createdAt', 'desc').limit(50).get();

    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div class="card">
          <div class="card-header">
            <h3>${esc(d.studentName)}</h3>
            <span class="card-meta">${formatDate(d.createdAt)}</span>
          </div>
          <div class="card-body">${esc(d.content)}</div>
        </div>`;
    });
    $('progress-list').innerHTML = html || emptyState('📈', 'No progress updates yet.');
  } catch (e) {
    console.error(e);
    $('progress-list').innerHTML = '<p>Error loading progress.</p>';
  }
}

async function renderStudentProgress(area) {
  area.innerHTML = `
    <div class="page-header"><h2>My Progress</h2><p>Submit your daily progress updates</p></div>
    <div class="create-form">
      <h3>Submit Daily Progress</h3>
      <div class="form-group">
        <label>What did you work on today?</label>
        <textarea id="progress-content" placeholder="Describe what you learned or worked on today..."></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="submitProgress()">Submit Progress</button>
      </div>
    </div>
    <div class="page-header"><h2>My Past Updates</h2></div>
    <div id="my-progress-list">Loading...</div>`;

  try {
    const snap = await db.collection('submissions')
      .where('studentId', '==', currentUser.uid)
      .where('type', '==', 'progress')
      .orderBy('createdAt', 'desc').limit(20).get();

    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div class="card">
          <div class="card-header">
            <h3>Progress Update</h3>
            <span class="card-meta">${formatDate(d.createdAt)}</span>
          </div>
          <div class="card-body">${esc(d.content)}</div>
        </div>`;
    });
    $('my-progress-list').innerHTML = html || emptyState('📈', 'No progress updates yet. Submit one above!');
  } catch (e) {
    console.error(e);
    $('my-progress-list').innerHTML = '<p>Error loading progress.</p>';
  }
}

async function submitProgress() {
  const content = $('progress-content').value.trim();
  if (!content) { toast('Write something about your progress.', 'error'); return; }

  try {
    await db.collection('submissions').add({
      type: 'progress',
      content,
      studentId: currentUser.uid,
      studentName: currentUserData.displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('Progress submitted!', 'success');
    renderTab('progress');
  } catch (e) {
    console.error(e);
    toast('Error submitting progress.', 'error');
  }
}

// ===================== CALENDAR =====================
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let calendarProgressData = {};
let calendarStudentList = [];
let calendarSelectedStudent = null;

async function renderCalendar(area) {
  const isTeacher = currentUserData.role === 'teacher';

  area.innerHTML = `
    <div class="page-header">
      <h2>📅 Progress Calendar</h2>
      <p>${isTeacher ? 'View each student\'s daily progress' : 'Your daily progress at a glance'}</p>
    </div>
    ${isTeacher ? `<div id="student-picker" class="calendar-wrapper" style="margin-bottom:16px;padding:16px">Loading students...</div>` : ''}
    <div class="calendar-wrapper">
      <div class="calendar-nav">
        <button onclick="changeCalendarMonth(-1)">&larr;</button>
        <h3 id="calendar-month-label"></h3>
        <button onclick="changeCalendarMonth(1)">&rarr;</button>
      </div>
      <div class="calendar-grid" id="calendar-grid"></div>
      <div class="calendar-legend">
        <span><span class="legend-dot active"></span> Progress logged</span>
        <span><span class="legend-dot today-ring"></span> Today</span>
      </div>
      <div id="calendar-detail"></div>
    </div>`;

  if (isTeacher) {
    await loadStudentList();
    renderStudentPicker();
  }

  await loadCalendarData();
  buildCalendarGrid();
}

async function loadStudentList() {
  calendarStudentList = [];
  if (previewMode) {
    calendarStudentList = [
      { id: 'prev-1', name: 'Arjun' },
      { id: 'prev-2', name: 'Priya' },
      { id: 'prev-3', name: 'Rahul' },
      { id: 'prev-4', name: 'Meera' },
      { id: 'prev-5', name: 'Karthik' }
    ];
  } else {
    try {
      const snap = await db.collection('users').where('role', '==', 'student').get();
      snap.forEach(doc => {
        const d = doc.data();
        calendarStudentList.push({ id: doc.id, name: d.displayName || d.username });
      });
    } catch (e) { console.error(e); }
  }
  if (calendarStudentList.length > 0 && !calendarSelectedStudent) {
    calendarSelectedStudent = calendarStudentList[0];
  }
}

function renderStudentPicker() {
  const picker = $('student-picker');
  if (!picker) return;
  picker.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <label style="font-weight:600;font-size:14px;white-space:nowrap">Select Student:</label>
      <div class="student-tabs" id="student-tabs">
        ${calendarStudentList.map(s =>
          `<button class="student-tab ${calendarSelectedStudent && calendarSelectedStudent.id === s.id ? 'active' : ''}"
                   onclick="selectCalendarStudent('${s.id}')">${esc(s.name)}</button>`
        ).join('')}
      </div>
    </div>`;
}

async function selectCalendarStudent(studentId) {
  calendarSelectedStudent = calendarStudentList.find(s => s.id === studentId) || null;
  renderStudentPicker();
  await loadCalendarData();
  buildCalendarGrid();
}

async function loadCalendarData() {
  calendarProgressData = {};
  const isTeacher = currentUserData.role === 'teacher';

  if (previewMode) {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    if (isTeacher && calendarSelectedStudent) {
      const studentLogs = {
        'Arjun': [
          'Trained CNN for 20 epochs. Accuracy: 78%. Adjusting learning rate.',
          'Added batch normalization layers. Accuracy jumped to 81%.',
          'Debugged vanishing gradient — switched to ReLU. Loss is converging now.',
          'Data augmentation: random crop + flip. Accuracy now 83%.',
          'Hyperparameter tuning with grid search. Best LR: 0.001.',
          'Reached 86% accuracy! Writing up the report.',
          'Refactored training loop. Added early stopping and checkpoints.'
        ],
        'Priya': [
          'Implemented BST insert and search. Unit tests pass.',
          'Working on BST delete — leaf and single-child cases done.',
          'BST delete with two children working. All tests green.',
          'Reviewed graph representations — adjacency list vs matrix.',
          'Implemented BFS and DFS traversal. Visualized with print output.',
          'Started Dijkstra\'s algorithm. Priority queue with heapq.',
          'Dijkstra complete. Tested on 5 sample graphs.'
        ],
        'Rahul': [
          'Set up Express server with basic routes.',
          'Implemented JWT auth: register + login endpoints working.',
          'Added middleware for protected routes. Token validation OK.',
          'CRUD endpoints for /projects resource. Using MongoDB.',
          'Input validation with Joi. Error handling middleware added.',
          'Wrote Postman test collection for all endpoints.',
          'Added rate limiting and CORS configuration. Ready for review.'
        ],
        'Meera': [
          'Studied attention mechanisms. Read "Attention Is All You Need".',
          'Implemented self-attention from scratch in NumPy.',
          'Built a simple transformer encoder block in PyTorch.',
          'Trained a text classifier using transformer encoder. 88% accuracy.',
          'Compared transformer vs LSTM for sentiment analysis task.',
          'Fine-tuning a pre-trained BERT model on our dataset.',
          'BERT fine-tuning done. Accuracy: 93%. Writing analysis.'
        ],
        'Karthik': [
          'Practiced LeetCode — solved 3 medium graph problems.',
          'Reviewed dynamic programming. Solved knapsack and LCS.',
          'Started mini project: sentiment analyzer with VADER.',
          'Integrated VADER with a Flask web interface.',
          'Added real-time sentiment graph using Chart.js.',
          'Deployed sentiment app to localhost. Testing edge cases.',
          'Wrote unit tests. Code review with teammate done.'
        ]
      };
      const name = calendarSelectedStudent.name;
      const logs = studentLogs[name] || studentLogs['Arjun'];
      let logIdx = 0;
      for (let d = 1; d <= Math.min(daysInMonth, today.getDate()); d++) {
        const skip = (name === 'Arjun') ? (d % 6 === 0) :
                     (name === 'Priya') ? (d % 4 === 0 || d % 7 === 0) :
                     (name === 'Rahul') ? (d % 5 === 0 || d % 3 === 0) :
                     (name === 'Meera') ? (d % 8 === 0) :
                     (d % 3 === 0 || d % 9 === 0);
        if (!skip) {
          const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          calendarProgressData[key] = [{
            content: logs[logIdx % logs.length],
            time: `${2 + (d % 4)}:${String((d * 7) % 60).padStart(2, '0')} PM`
          }];
          logIdx++;
        }
      }
    } else if (!isTeacher) {
      const sampleDays = [1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28];
      const sampleLogs = [
        'Trained CNN for 20 epochs. Accuracy: 78%. Adjusting learning rate.',
        'Implemented BST delete operation. All 3 cases handled. Tests pass.',
        'Read backpropagation notes. Derived gradients for a 2-layer network on paper.',
        'Built REST API endpoints for CRUD. Added input validation with Joi.',
        'Reviewed graph algorithms — BFS, DFS, Dijkstra. Practiced on LeetCode.',
        'Debugged vanishing gradient issue. Switched to ReLU activations.',
        'Set up JWT middleware for protected routes. Token refresh working.',
        'Data augmentation added: random crop, horizontal flip. Accuracy now 83%.',
        'Studied attention mechanisms and transformers architecture.',
        'Completed Python proficiency quiz. Reviewed weak areas: generators, decorators.'
      ];
      sampleDays.forEach((d, i) => {
        if (d <= daysInMonth) {
          const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          calendarProgressData[key] = [{ content: sampleLogs[i % sampleLogs.length], time: '3:30 PM' }];
        }
      });
    }
    return;
  }

  try {
    const startDate = new Date(calendarYear, calendarMonth, 1);
    const endDate = new Date(calendarYear, calendarMonth + 1, 0, 23, 59, 59);

    let targetId = isTeacher
      ? (calendarSelectedStudent ? calendarSelectedStudent.id : null)
      : currentUser.uid;

    if (!targetId) return;

    const snap = await db.collection('submissions')
      .where('studentId', '==', targetId)
      .where('type', '==', 'progress')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'asc').get();

    snap.forEach(doc => {
      const d = doc.data();
      if (d.createdAt) {
        const date = d.createdAt.toDate();
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!calendarProgressData[key]) calendarProgressData[key] = [];
        calendarProgressData[key].push({
          content: d.content,
          time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
}

function buildCalendarGrid() {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  $('calendar-month-label').textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();

  let html = dayLabels.map(d => `<div class="calendar-day-label">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entries = calendarProgressData[key];
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === d;

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (entries) classes += ' has-progress';

    html += `<div class="${classes}" ${entries ? `onclick="showCalendarDetail('${key}')"` : ''}>${d}</div>`;
  }

  $('calendar-grid').innerHTML = html;
  $('calendar-detail').innerHTML = '';
}

function showCalendarDetail(key) {
  const entries = calendarProgressData[key];
  if (!entries || entries.length === 0) return;

  const [y, m, d] = key.split('-');
  const dateStr = new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  let html = `<div class="calendar-detail"><h4>📋 ${dateStr}</h4>`;
  entries.forEach(e => {
    html += `<div class="detail-entry"><strong style="color:var(--text-secondary);font-size:12px">${e.time}</strong><br>${esc(e.content)}</div>`;
  });
  html += '</div>';
  $('calendar-detail').innerHTML = html;
}

async function changeCalendarMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  await loadCalendarData();
  buildCalendarGrid();
}

// ===================== QUESTIONS =====================
async function renderTeacherQuestions(area) {
  area.innerHTML = `
    <div class="page-header"><h2>Student Questions</h2><p>View and reply to questions from students</p></div>
    <div id="questions-list">Loading...</div>`;

  try {
    const snap = await db.collection('submissions')
      .where('type', '==', 'question')
      .orderBy('createdAt', 'desc').limit(50).get();

    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div class="card">
          <div class="card-header">
            <h3>${esc(d.title)}</h3>
            <span class="badge badge-blue">${esc(d.studentName)}</span>
          </div>
          <div class="card-meta">${formatDate(d.createdAt)}</div>
          <div class="card-body">${esc(d.content)}</div>
          ${d.reply ? `
            <div class="reply-box">
              <strong>Your Reply:</strong>
              <p>${esc(d.reply)}</p>
            </div>` : `
            <div class="card-footer">
              <button class="btn btn-primary btn-sm" onclick="openReplyForm('${doc.id}')">Reply</button>
            </div>`}
        </div>`;
    });
    $('questions-list').innerHTML = html || emptyState('💬', 'No questions from students yet.');
  } catch (e) {
    console.error(e);
    $('questions-list').innerHTML = '<p>Error loading questions.</p>';
  }
}

function openReplyForm(questionId) {
  const html = `
    <div class="form-group">
      <label>Your Reply</label>
      <textarea id="reply-text" placeholder="Type your reply..."></textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="submitReply('${questionId}')">Send Reply</button>`;
  openModal('Reply to Question', html);
}

async function submitReply(questionId) {
  const reply = $('reply-text').value.trim();
  if (!reply) { toast('Write a reply.', 'error'); return; }

  try {
    await db.collection('submissions').doc(questionId).update({ reply });
    closeModal();
    toast('Reply sent!', 'success');
    renderTab('questions');
  } catch (e) {
    console.error(e);
    toast('Error sending reply.', 'error');
  }
}

async function renderStudentQuestions(area) {
  area.innerHTML = `
    <div class="page-header"><h2>Ask a Question</h2><p>Send a question to your teacher</p></div>
    <div class="create-form">
      <h3>New Question</h3>
      <div class="form-group">
        <label>Subject</label>
        <input type="text" id="question-title" placeholder="Brief subject of your question">
      </div>
      <div class="form-group">
        <label>Details</label>
        <textarea id="question-content" placeholder="Describe your question in detail..."></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="submitQuestion()">Send Question</button>
      </div>
    </div>
    <div class="page-header"><h2>My Questions</h2></div>
    <div id="my-questions-list">Loading...</div>`;

  try {
    const snap = await db.collection('submissions')
      .where('studentId', '==', currentUser.uid)
      .where('type', '==', 'question')
      .orderBy('createdAt', 'desc').limit(20).get();

    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div class="card">
          <div class="card-header">
            <h3>${esc(d.title)}</h3>
            <span class="card-meta">${formatDate(d.createdAt)}</span>
          </div>
          <div class="card-body">${esc(d.content)}</div>
          ${d.reply ? `
            <div class="reply-box">
              <strong>Teacher's Reply:</strong>
              <p>${esc(d.reply)}</p>
            </div>` : '<span class="badge badge-yellow">Awaiting reply</span>'}
        </div>`;
    });
    $('my-questions-list').innerHTML = html || emptyState('💬', 'No questions yet. Ask one above!');
  } catch (e) {
    console.error(e);
    $('my-questions-list').innerHTML = '<p>Error loading questions.</p>';
  }
}

async function submitQuestion() {
  const title = $('question-title').value.trim();
  const content = $('question-content').value.trim();
  if (!title || !content) { toast('Fill in both subject and details.', 'error'); return; }

  try {
    await db.collection('submissions').add({
      type: 'question',
      title,
      content,
      studentId: currentUser.uid,
      studentName: currentUserData.displayName,
      reply: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('Question sent!', 'success');
    renderTab('questions');
  } catch (e) {
    console.error(e);
    toast('Error submitting question.', 'error');
  }
}

// ===================== GENERIC POST CRUD =====================
function createFormHtml(type, heading, fields) {
  return `
    <div class="create-form">
      <h3>${heading}</h3>
      ${fields.map(f => `
        <div class="form-group">
          <label>${f.label}</label>
          ${f.type === 'textarea'
            ? `<textarea id="create-${type}-${f.name}" placeholder="${f.placeholder || ''}"></textarea>`
            : `<input type="${f.type}" id="create-${type}-${f.name}" placeholder="${f.placeholder || ''}">`
          }
        </div>`).join('')}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="createPost('${type}')">Publish</button>
      </div>
    </div>`;
}

async function createPost(type) {
  const title = $(`create-${type}-title`)?.value.trim();
  const content = $(`create-${type}-content`)?.value.trim();
  const dueDate = $(`create-${type}-dueDate`)?.value || null;

  if (!title) { toast('Title is required.', 'error'); return; }
  if (!content) { toast('Content is required.', 'error'); return; }

  try {
    await db.collection('posts').add({
      type,
      title,
      content,
      dueDate,
      authorId: currentUser.uid,
      authorName: currentUserData.displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast(`${capitalize(type)} published!`, 'success');
    renderTab(currentTab);
  } catch (e) {
    console.error(e);
    toast('Error publishing.', 'error');
  }
}

async function loadPosts(type, containerId, canDelete) {
  try {
    const snap = await db.collection('posts').where('type', '==', type)
      .orderBy('createdAt', 'desc').get();

    let html = '';
    snap.forEach(doc => {
      html += postCard(doc.data(), doc.id, canDelete);
    });

    $(containerId).innerHTML = html || emptyState(
      type === 'announcement' ? '📡' : type === 'note' ? '🧠' : '⚙️',
      `No ${type}s yet.`
    );
  } catch (e) {
    console.error(e);
    $(containerId).innerHTML = `<p>Error loading ${type}s.</p>`;
  }
}

function postCard(d, id, canDelete) {
  return `
    <div class="card">
      <div class="card-header">
        <h3>${esc(d.title)}</h3>
        ${d.dueDate ? `<span class="badge badge-yellow">Due: ${d.dueDate}</span>` : ''}
      </div>
      <div class="card-meta">${formatDate(d.createdAt)}</div>
      <div class="card-body">${esc(d.content)}</div>
      ${canDelete ? `
        <div class="card-footer">
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deletePost('${id}')">Delete</button>
        </div>` : ''}
    </div>`;
}

async function deletePost(postId) {
  if (!confirm('Delete this item?')) return;
  try {
    await db.collection('posts').doc(postId).delete();
    toast('Deleted.', 'success');
    renderTab(currentTab);
  } catch (e) {
    console.error(e);
    toast('Error deleting.', 'error');
  }
}

// ===================== MODAL =====================
function openModal(title, bodyHtml) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHtml;
  show($('modal-overlay'));
}

function closeModal(e) {
  if (e && e.target !== $('modal-overlay')) return;
  hide($('modal-overlay'));
}

// ===================== TOAST =====================
function toast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast-${type}`;
  show(t);
  clearTimeout(t._timer);
  t._timer = setTimeout(() => hide(t), 3500);
}

// ===================== UTILITIES =====================
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${text}</p></div>`;
}

// ===================== PREVIEW MODE =====================
let previewMode = false;

function startPreview(role) {
  previewMode = true;
  currentUser = { uid: 'preview-user' };
  currentUserData = {
    username: role === 'teacher' ? 'teacher' : 'student1',
    displayName: role === 'teacher' ? 'Teacher' : 'Student 1',
    role
  };
  hide($('loading'));
  hide($('auth-view'));
  show($('app-view'));
  buildSidebar();
  currentTab = 'dashboard';
  renderPreviewDashboard(role);

  document.querySelectorAll('#nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === 'dashboard');
  });
}

function renderPreviewDashboard(role) {
  const area = $('content-area');
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (role === 'teacher') {
    area.innerHTML = `
      <div class="page-header">
        <h2>Welcome, Professor</h2>
        <p>Instructor Dashboard — <span class="badge badge-yellow">Preview Mode</span></p>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">5</div><div class="stat-label">🧑‍💻 Students</div></div>
        <div class="stat-card"><div class="stat-value">3</div><div class="stat-label">⚙️ Tasks</div></div>
        <div class="stat-card"><div class="stat-value">2</div><div class="stat-label">🧪 Quizzes</div></div>
        <div class="stat-card"><div class="stat-value">12</div><div class="stat-label">📥 Submissions</div></div>
      </div>
      <div class="page-header"><h2>📡 Recent Announcements</h2></div>
      <div class="card">
        <div class="card-header"><h3>🚀 Welcome to CS/AI Engineering Lab</h3></div>
        <div class="card-meta">${now}</div>
        <div class="card-body">Hello engineers! This is our class hub. Check here daily for lab tasks, coding assignments, quizzes, and announcements. Let's build something great this semester.</div>
        <div class="card-footer">
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Delete disabled in preview','info')">Delete</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🤖 AI/ML Project Deadline Extended</h3></div>
        <div class="card-meta">${now}</div>
        <div class="card-body">The neural network classifier project deadline has been extended to next Friday. Make sure your model achieves at least 85% accuracy on the test set.</div>
        <div class="card-footer">
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Delete disabled in preview','info')">Delete</button>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <div class="page-header">
        <h2>Welcome, Student 1</h2>
        <p>Student Dashboard — <span class="badge badge-yellow">Preview Mode</span></p>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">3</div><div class="stat-label">⚙️ Total Tasks</div></div>
        <div class="stat-card"><div class="stat-value">1</div><div class="stat-label">✅ Tasks Done</div></div>
        <div class="stat-card"><div class="stat-value">2</div><div class="stat-label">🧪 Quizzes</div></div>
        <div class="stat-card"><div class="stat-value">4</div><div class="stat-label">📊 Progress Logs</div></div>
      </div>
      <div class="page-header"><h2>📡 Recent Announcements</h2></div>
      <div class="card">
        <div class="card-header"><h3>🚀 Welcome to CS/AI Engineering Lab</h3></div>
        <div class="card-meta">${now}</div>
        <div class="card-body">Hello engineers! This is our class hub. Check here daily for lab tasks, coding assignments, quizzes, and announcements.</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🤖 AI/ML Project Deadline Extended</h3></div>
        <div class="card-meta">${now}</div>
        <div class="card-body">The neural network classifier project deadline has been extended to next Friday. Make sure your model achieves at least 85% accuracy on the test set.</div>
      </div>`;
  }
}

function renderPreviewTab(tab, role) {
  const area = $('content-area');
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isTeacher = role === 'teacher';

  const previewContent = {
    dashboard: () => renderPreviewDashboard(role),
    announcements: () => {
      area.innerHTML = `
        <div class="page-header"><h2>📡 Announcements</h2><p>Broadcasts for the engineering lab</p></div>
        ${isTeacher ? `<div class="create-form"><h3>New Announcement</h3>
          <div class="form-group"><label>Title</label><input type="text" placeholder="Announcement title"></div>
          <div class="form-group"><label>Content</label><textarea placeholder="Write your announcement..."></textarea></div>
          <div class="form-actions"><button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Publish</button></div></div>` : ''}
        <div class="card"><div class="card-header"><h3>🚀 Welcome to CS/AI Engineering Lab</h3></div><div class="card-meta">${now}</div>
          <div class="card-body">Hello engineers! This is our class hub. All assignments, notes, and quizzes will be posted here. Check in daily.</div></div>
        <div class="card"><div class="card-header"><h3>🤖 AI/ML Project Deadline Extended</h3></div><div class="card-meta">${now}</div>
          <div class="card-body">The neural network classifier project deadline has been extended to next Friday. Target: 85% accuracy on the test set.</div></div>
        <div class="card"><div class="card-header"><h3>🔧 GPU Server Maintenance Tonight</h3></div><div class="card-meta">${now}</div>
          <div class="card-body">The training cluster will be down 10 PM – 2 AM for maintenance. Plan your training runs accordingly.</div></div>`;
    },
    notes: () => {
      area.innerHTML = `
        <div class="page-header"><h2>🧠 Notes</h2><p>Lecture notes and reference material</p></div>
        ${isTeacher ? `<div class="create-form"><h3>Upload Notes</h3>
          <div class="form-group"><label>Title</label><input type="text" placeholder="Note title"></div>
          <div class="form-group"><label>Content</label><textarea placeholder="Write or paste your notes here..."></textarea></div>
          <div class="form-actions"><button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Publish</button></div></div>` : ''}
        <div class="card"><div class="card-header"><h3>📐 Neural Networks — Backpropagation</h3></div><div class="card-meta">${now}</div>
          <div class="card-body">1. Forward pass — compute predictions\n2. Loss function — MSE, Cross-Entropy\n3. Backward pass — chain rule for gradients\n4. Weight update — SGD, Adam optimizer\n5. Regularization — Dropout, L2 penalty</div></div>
        <div class="card"><div class="card-header"><h3>🗄️ Data Structures — Trees & Graphs</h3></div><div class="card-meta">${now}</div>
          <div class="card-body">1. Binary Search Trees — O(log n) lookup\n2. AVL / Red-Black Trees — self-balancing\n3. Graph representations — adjacency list vs matrix\n4. BFS & DFS traversal\n5. Dijkstra's shortest path algorithm</div></div>`;
    },
    tasks: () => {
      area.innerHTML = `
        <div class="page-header"><h2>⚙️ Tasks</h2><p>${isTeacher ? 'Create and manage lab assignments' : 'View and complete lab assignments'}</p></div>
        ${isTeacher ? `<div class="create-form"><h3>Create Task</h3>
          <div class="form-group"><label>Title</label><input type="text" placeholder="Task title"></div>
          <div class="form-group"><label>Description</label><textarea placeholder="Describe the task..."></textarea></div>
          <div class="form-group"><label>Due Date (optional)</label><input type="date"></div>
          <div class="form-actions"><button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Publish</button></div></div>` : ''}
        <div class="card">
          <div class="card-header"><h3>🧬 Build a CNN Image Classifier</h3><span class="badge badge-yellow">Due: 2026-03-15</span></div>
          <div class="card-body">Train a convolutional neural network on CIFAR-10. Use PyTorch or TensorFlow. Submit your notebook + model weights. Target accuracy: 85%.</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<button class="btn btn-success btn-sm" onclick="toast('Disabled in preview','info')">Mark as Done</button>`}</div></div>
        <div class="card">
          <div class="card-header"><h3 class="${!isTeacher ? 'completed-text' : ''}">💻 Implement a Binary Search Tree</h3></div>
          <div class="card-body ${!isTeacher ? 'completed-text' : ''}">Implement insert, delete, search, and in-order traversal in Python. Write unit tests for each operation.</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<span class="badge badge-green">Completed</span>`}</div></div>
        <div class="card">
          <div class="card-header"><h3>🔗 REST API with Authentication</h3><span class="badge badge-yellow">Due: 2026-03-20</span></div>
          <div class="card-body">Build a REST API using Node.js/Express with JWT authentication. Include endpoints for CRUD operations on a resource of your choice.</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<button class="btn btn-success btn-sm" onclick="toast('Disabled in preview','info')">Mark as Done</button>`}</div></div>`;
    },
    quizzes: () => {
      area.innerHTML = `
        <div class="page-header"><h2>🧪 Quizzes</h2><p>${isTeacher ? 'Create and manage quizzes' : 'Test your knowledge'}</p></div>
        ${isTeacher ? `<div class="create-form"><h3>Create Quiz</h3>
          <div class="form-group"><label>Quiz Title</label><input type="text" placeholder="Enter quiz title"></div>
          <div id="quiz-builder"></div>
          <div class="form-actions">
            <button class="btn btn-outline" onclick="toast('Disabled in preview','info')">+ Add Question</button>
            <button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Create Quiz</button>
          </div></div>` : ''}
        <div class="card">
          <div class="card-header"><h3>🧠 Machine Learning Fundamentals</h3><span class="badge badge-blue">5 questions</span></div>
          <div class="card-meta">${now}</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm btn-outline" onclick="toast('Disabled in preview','info')">View Results</button>
               <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<button class="btn btn-primary btn-sm" onclick="toast('Disabled in preview','info')">Take Quiz</button>`}</div></div>
        <div class="card">
          <div class="card-header"><h3>🗄️ Data Structures & Algorithms</h3><span class="badge badge-blue">10 questions</span></div>
          <div class="card-meta">${now}</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm btn-outline" onclick="toast('Disabled in preview','info')">View Results</button>
               <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<span class="score score-good">8/10</span> <span class="badge badge-green">Completed</span>`}</div></div>
        <div class="card">
          <div class="card-header"><h3>🐍 Python Proficiency Check</h3><span class="badge badge-blue">8 questions</span></div>
          <div class="card-meta">${now}</div>
          <div class="card-footer">${isTeacher
            ? `<button class="btn btn-sm btn-outline" onclick="toast('Disabled in preview','info')">View Results</button>
               <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="toast('Disabled in preview','info')">Delete</button>`
            : `<span class="score score-ok">5/8</span> <span class="badge badge-green">Completed</span>`}</div></div>`;
    },
    progress: () => {
      if (isTeacher) {
        area.innerHTML = `
          <div class="page-header"><h2>📊 Student Progress</h2><p>Daily engineering logs from students</p></div>
          <div class="card"><div class="card-header"><h3>🧑‍💻 Arjun</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">Trained the CNN for 50 epochs — reached 82% accuracy. Trying data augmentation next to push past 85%. Also debugged the vanishing gradient issue by switching to ReLU.</div></div>
          <div class="card"><div class="card-header"><h3>🧑‍💻 Priya</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">Implemented BST insert and search. Unit tests passing. Starting on delete (handling the 3 cases: leaf, one child, two children). Also reviewed graph BFS for the quiz.</div></div>
          <div class="card"><div class="card-header"><h3>🧑‍💻 Rahul</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">Set up Express server with JWT auth. POST /register and POST /login working. Need to add middleware for protected routes tomorrow.</div></div>`;
      } else {
        area.innerHTML = `
          <div class="page-header"><h2>📊 My Progress</h2><p>Log what you worked on today</p></div>
          <div class="create-form"><h3>Submit Daily Progress</h3>
            <div class="form-group"><label>What did you work on today?</label>
              <textarea placeholder="e.g. Trained model for 20 epochs, debugged loss function, reviewed lecture notes on transformers..."></textarea></div>
            <div class="form-actions"><button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Submit Progress</button></div></div>
          <div class="page-header"><h2>My Past Updates</h2></div>
          <div class="card"><div class="card-header"><h3>Progress Update</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">Trained the CNN for 50 epochs — reached 82% accuracy. Trying data augmentation next to push past 85%.</div></div>
          <div class="card"><div class="card-header"><h3>Progress Update</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">Read the backpropagation notes. Implemented forward pass manually in NumPy to understand the math before using PyTorch.</div></div>`;
      }
    },
    calendar: () => {
      renderCalendar(area);
    },
    questions: () => {
      if (isTeacher) {
        area.innerHTML = `
          <div class="page-header"><h2>💬 Student Questions</h2><p>View and reply to questions from students</p></div>
          <div class="card"><div class="card-header"><h3>Vanishing gradients with sigmoid?</h3><span class="badge badge-blue">Arjun</span></div>
            <div class="card-meta">${now}</div><div class="card-body">My CNN loss plateaus after epoch 10. I'm using sigmoid activations — could this be a vanishing gradient problem? Should I switch to ReLU for all hidden layers?</div>
            <div class="card-footer"><button class="btn btn-primary btn-sm" onclick="toast('Disabled in preview','info')">Reply</button></div></div>
          <div class="card"><div class="card-header"><h3>Can we use TensorFlow instead of PyTorch?</h3><span class="badge badge-blue">Priya</span></div>
            <div class="card-meta">${now}</div><div class="card-body">I'm more comfortable with TensorFlow/Keras. Is it okay to submit the CNN project using tf.keras instead of PyTorch?</div>
            <div class="reply-box"><strong>Your Reply:</strong><p>Yes, TensorFlow is fine. The grading criteria is the same — architecture, accuracy, and code quality.</p></div></div>`;
      } else {
        area.innerHTML = `
          <div class="page-header"><h2>💬 Ask a Question</h2><p>Send a question to your professor</p></div>
          <div class="create-form"><h3>New Question</h3>
            <div class="form-group"><label>Subject</label><input type="text" placeholder="e.g. Confusion about backpropagation step 3"></div>
            <div class="form-group"><label>Details</label><textarea placeholder="Describe your question in detail..."></textarea></div>
            <div class="form-actions"><button class="btn btn-primary" onclick="toast('Disabled in preview','info')">Send Question</button></div></div>
          <div class="page-header"><h2>My Questions</h2></div>
          <div class="card"><div class="card-header"><h3>Vanishing gradients with sigmoid?</h3><span class="card-meta">${now}</span></div>
            <div class="card-body">My CNN loss plateaus after epoch 10. I'm using sigmoid activations — could this be a vanishing gradient problem?</div>
            <span class="badge badge-yellow">Awaiting reply</span></div>`;
      }
    }
  };

  if (previewContent[tab]) previewContent[tab]();
}

// Override switchTab for preview mode
const _originalSwitchTab = switchTab;
switchTab = function(tab, e) {
  if (e) e.preventDefault();
  currentTab = tab;
  document.querySelectorAll('#nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  $('sidebar').classList.remove('open');

  if (previewMode) {
    renderPreviewTab(tab, currentUserData.role);
  } else {
    renderTab(tab);
  }
};
