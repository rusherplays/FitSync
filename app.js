// -----------------------------------------
// DATABASE & STATE INIT
// -----------------------------------------
const db = new Dexie('FiitSyncDB');
db.version(1).stores({
  photos: '++id, date, image, timestamp'
});

const defaultState = {
  mode: 'beginner',
  streak: 0,
  bestStreak: 0,
  totalWorkouts: 0,
  workoutDates: [],
  lastCompletedDate: null,
  installPromptDismissed: null,
  logs: [], // contains {date, weight, energy, soreness, sleep, notes, timestamp}
  height: 175,
  water: 0,
  steps: 0,
  sleep: 0,
  lastDailyReset: null
};

function getState() {
  let s = JSON.parse(localStorage.getItem('fiitsync_state'));
  if(!s) s = defaultState;
  else {
    // Merge missing defaults
    Object.keys(defaultState).forEach(k => {
      if(s[k] === undefined) s[k] = defaultState[k];
    });
  }
  return s;
}

function saveState(state) {
  localStorage.setItem('fiitsync_state', JSON.stringify(state));
}

function getTodayStr() {
  return new Date().toDateString();
}

function getDailyProgress(date) {
  return JSON.parse(localStorage.getItem(`fiitsync_prog_${date}`)) || {};
}

function saveDailyProgress(date, prog) {
  localStorage.setItem(`fiitsync_prog_${date}`, JSON.stringify(prog));
}

let appState = getState();
let calViewMonth = new Date().getMonth();
let calViewYear = new Date().getFullYear();

// Daily Reset for Targets
const todayStr = getTodayStr();
if(appState.lastDailyReset !== todayStr) {
  appState.water = 0;
  appState.steps = 0;
  appState.sleep = 0;
  appState.lastDailyReset = todayStr;
  saveState(appState);
}

// -----------------------------------------
// ROUTINE DATA & ANIMATIONS (GIFs)
// -----------------------------------------
const ANIMATIONS = {
  pushup: `<video src="./assets/gifs/pushup.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  curl: `<video src="./assets/gifs/curl.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  press: `<video src="./assets/gifs/press.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  squat: `<video src="./assets/gifs/squat.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  lunge: `<video src="./assets/gifs/lunge.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  row: `<video src="./assets/gifs/row.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  plank: `<video src="./assets/gifs/plank.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  ab: `<video src="./assets/gifs/ab.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  warmup: `<video src="./assets/gifs/warmup.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  cardio: `<video src="./assets/gifs/cardio.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  stretch: `<video src="./assets/gifs/stretch.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  armcircle: `<video src="./assets/gifs/armcircle.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  neckrotation: `<video src="./assets/gifs/neckrotation.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  skipping: `<video src="./assets/gifs/skipping.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  walking: `<video src="./assets/gifs/walking.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  cycling: `<video src="./assets/gifs/cycling.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`,
  abroller: `<video src="./assets/gifs/abroller.mp4" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>`
};

const routines = {
  beginner: [
    { day: 0, type: "Rest & Recover", desc: "Light walking, stretching. Focus on hydration.", exercises: [] },
    { day: 1, type: "Full Body Foundation", desc: "Build basic strength and habits.", exercises: [
      {name: "Light Stretching", sets:"2 min", type:"stretch", desc:"Stretch sides and legs."},
      {name: "Arm Circles", sets:"1 min", type:"armcircle", desc:"Forward and reverse circles."},
      {name: "Neck Rotation", sets:"1 min", type:"neckrotation", desc:"Slow, controlled rotations."},
      {name: "Bodyweight Squats", sets:"3 sets × 10 reps", type:"squat", desc:"Push hips back and down. Keep chest up."},
      {name: "Knee Push-ups", sets:"3 sets × 8 reps", type:"pushup", desc:"Chest to floor. Go slowly."},
      {name: "Ab Roller", sets:"3 sets × 8-10 reps", type:"abroller", desc:"Keep core tight. Go slowly."}
    ]},
    { day: 2, type: "Rest & Recover", desc: "Allow muscles to rebuild.", exercises: [] },
    { day: 3, type: "Full Body Foundation", desc: "Consistency is key.", exercises: [
      {name: "Rope Skipping", sets:"5-10 min", type:"skipping", desc:"Comfortable pace or intervals."},
      {name: "Lunges", sets:"3 sets × 10 reps/leg", type:"lunge", desc:"Step forward, lower back knee toward floor."},
      {name: "Dumbbell Rows", sets:"3 sets × 10 reps", type:"row", desc:"Hinge forward, pull weight to hip."},
      {name: "Crunches", sets:"3 sets × 15 reps", type:"ab", desc:"Contract abs, small movement."}
    ]},
    { day: 4, type: "Rest & Recover", desc: "Active stretching.", exercises: [] },
    { day: 5, type: "Full Body Foundation", desc: "Finishing the week strong.", exercises: [
      {name: "Cycling", sets:"20-40 min", type:"cycling", desc:"Steady pace."},
      {name: "Pike Push-ups", sets:"3 sets × 8 reps", type:"press", desc:"Target shoulders."},
      {name: "Bicycle Crunches", sets:"3 sets × 20 reps", type:"ab", desc:"Touch opposite elbow to knee."}
    ]},
    { day: 6, type: "Active Recovery", desc: "30 min brisk walk.", exercises: [
      {name: "Brisk Walk", sets:"30 min", type:"walking", desc:"Elevate heart rate naturally."},
      {name: "Full Body Stretch", sets:"10 min", type:"stretch", desc:"Hold each stretch 30 seconds."}
    ]}
  ],
  advanced: [
    { day: 0, type: "Rest Day", desc: "Complete rest and meal prep.", exercises: [] },
    { day: 1, type: "Push (Chest/Shoulders/Triceps)", desc: "Heavy pressing day.", exercises: [
      {name: "Bench Press", sets:"4 sets × 8 reps", type:"press", desc:"Compound chest movement."},
      {name: "Overhead Press", sets:"4 sets × 8 reps", type:"press", desc:"Strict barbell overhead."},
      {name: "Tricep Dips", sets:"3 sets × 12 reps", type:"pushup", desc:"Keep elbows tucked."},
      {name: "Lateral Raises", sets:"4 sets × 15 reps", type:"warmup", desc:"Target side delts."}
    ]},
    { day: 2, type: "Pull (Back/Biceps)", desc: "Vertical and horizontal pulls.", exercises: [
      {name: "Pull-ups", sets:"4 sets × Max", type:"row", desc:"Wide grip, pull to chin."},
      {name: "Barbell Rows", sets:"4 sets × 10 reps", type:"row", desc:"Keep back straight."},
      {name: "Face Pulls", sets:"3 sets × 15 reps", type:"row", desc:"Target rear delts."},
      {name: "Bicep Curls", sets:"3 sets × 12 reps", type:"curl", desc:"Squeeze at the top."}
    ]},
    { day: 3, type: "Legs (Quads/Hams/Calves)", desc: "Heavy lower body.", exercises: [
      {name: "Squats", sets:"4 sets × 8 reps", type:"squat", desc:"Below parallel."},
      {name: "Romanian Deadlifts", sets:"4 sets × 10 reps", type:"squat", desc:"Hinge at hips, slight knee bend."},
      {name: "Leg Press", sets:"3 sets × 12 reps", type:"squat", desc:"Don't lock out knees."},
      {name: "Calf Raises", sets:"4 sets × 20 reps", type:"squat", desc:"Full stretch at bottom."}
    ]},
    { day: 4, type: "Push Hypertrophy", desc: "Volume focus.", exercises: [
      {name: "Incline DB Press", sets:"4 sets × 10 reps", type:"press", desc:"Target upper chest."},
      {name: "Arnold Press", sets:"3 sets × 12 reps", type:"press", desc:"Full shoulder rotation."},
      {name: "Tricep Extensions", sets:"3 sets × 15 reps", type:"curl", desc:"Overhead or cable."}
    ]},
    { day: 5, type: "Pull Hypertrophy", desc: "Volume focus.", exercises: [
      {name: "Lat Pulldowns", sets:"4 sets × 12 reps", type:"row", desc:"Control the negative."},
      {name: "Seated Cable Rows", sets:"3 sets × 12 reps", type:"row", desc:"Squeeze shoulder blades."},
      {name: "Hammer Curls", sets:"3 sets × 12 reps", type:"curl", desc:"Neutral grip."}
    ]},
    { day: 6, type: "Legs Hypertrophy", desc: "Volume focus.", exercises: [
      {name: "Front Squats", sets:"3 sets × 10 reps", type:"squat", desc:"Keep elbows high."},
      {name: "Bulgarian Split Squats", sets:"3 sets × 10 reps/leg", type:"lunge", desc:"Use dumbbells."},
      {name: "Leg Curls", sets:"3 sets × 15 reps", type:"squat", desc:"Hamstring isolation."}
    ]}
  ]
};

const motivationalTips = [
  "Consistency is the key to progress.",
  "Your only limit is you.",
  "Sweat is fat crying.",
  "Make it a habit, not a chore.",
  "The hardest lift of all is lifting your butt off the couch."
];

// -----------------------------------------
// INIT & PWA
// -----------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Disable SW in Vite dev mode to prevent CSS caching issues
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    } else {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.log('ServiceWorker registered with scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(err => console.log('SW fail', err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  });
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('dailyTip').innerText = `"${motivationalTips[Math.floor(Math.random() * motivationalTips.length)]}"`;

  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const targetId = e.currentTarget.dataset.target;
      document.getElementById(targetId).classList.add('active');
      if(targetId === 'view-progress') renderProgressPage();
    });
  });

  // Settings
  document.getElementById('toggleMode').checked = appState.mode === 'advanced';
  document.getElementById('toggleMode').addEventListener('change', (e) => {
    appState.mode = e.target.checked ? 'advanced' : 'beginner';
    saveState(appState);
    renderApp();
  });
  
  const hInput = document.getElementById('settingHeight');
  hInput.value = appState.height || '';
  hInput.addEventListener('change', (e) => saveSetting('height', e.target.value));

  const wInput = document.getElementById('settingWeight');
  wInput.value = appState.weight || '';
  wInput.addEventListener('change', (e) => saveSetting('weight', e.target.value));

  const tInput = document.getElementById('settingTargetWeight');
  tInput.value = appState.targetWeight || '';
  tInput.addEventListener('change', (e) => saveSetting('targetWeight', e.target.value));

  // API key logic removed

  document.getElementById('btnClearData').addEventListener('click', () => {
    if (confirm("Wipe all data? This cannot be undone.")) {
      localStorage.clear();
      db.photos.clear().then(() => window.location.reload());
    }
  });

  // Logs
  ['Energy', 'Soreness', 'Sleep'].forEach(metric => {
    document.getElementById(`slider${metric}`).addEventListener('input', (e) => {
      document.getElementById(`val${metric}`).innerText = e.target.value;
    });
  });
  document.getElementById('btnSaveLog').addEventListener('click', saveLog);

  // Photos
  document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

  renderApp();
  renderLogs();
  updateDailyTargetsUI();
}

function saveSetting(key, val) {
  appState[key] = val;
  saveState(appState);
  showToast(`${key} updated!`);
}

function renderApp() {
  document.getElementById('modeChip').innerText = appState.mode.toUpperCase();
  document.getElementById('modeDescText').innerText = appState.mode === 'beginner' 
    ? 'Beginner (Habit Building / Full Body)' : 'Advanced (Split Routine / High Intensity)';
  
  checkAndUpdateStreak();
  document.getElementById('streakCount').innerText = `${appState.streak} Days`;

  renderHome();
  renderSchedule();
}

// -----------------------------------------
// STREAK & HOME LOGIC
// -----------------------------------------
function checkAndUpdateStreak() {
  const today = new Date();
  today.setHours(0,0,0,0);
  if (appState.lastCompletedDate) {
    const lastDate = new Date(appState.lastCompletedDate);
    lastDate.setHours(0,0,0,0);
    const diffDays = Math.ceil(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24)); 
    if (diffDays > 1) {
      appState.streak = 0;
      saveState(appState);
    }
  }
}

function renderHome() {
  const todayNum = new Date().getDay();
  const todayRoutine = routines[appState.mode][todayNum];
  const container = document.getElementById('workoutCards');
  container.innerHTML = '';
  const prog = getDailyProgress(todayStr);

  if (todayRoutine.exercises.length === 0) {
    container.innerHTML = `
      <div class="workout-card glass" style="text-align:center; padding:40px 20px;">
        <i class="fa-solid fa-mug-hot" style="font-size:3rem; color:var(--accent-1); margin-bottom:15px;"></i>
        <h3>Rest Day</h3>
        <p style="color:var(--text-secondary); margin-top:10px;">${todayRoutine.desc}</p>
      </div>
    `;
    if (appState.lastCompletedDate !== todayStr) completeWorkoutDay();
    return;
  }

  let completedCount = 0;
  const totalCount = todayRoutine.exercises.length;
  let stepsHTML = '';

  todayRoutine.exercises.forEach((ex, idx) => {
    const isChecked = prog[idx] ? true : false;
    if (isChecked) completedCount++;

    stepsHTML += `
      <li class="step-item ${isChecked ? 'checked' : ''}" data-idx="${idx}">
        <div class="check-box" onclick="toggleStep(event, ${idx}, ${totalCount})">
          <i class="fa-solid fa-check"></i>
        </div>
        <span class="step-name" onclick="toggleStep(event, ${idx}, ${totalCount})">${ex.name} (${ex.sets})</span>
        <button class="btn-play-anim" onclick="openExerciseModal(${idx}, '${ex.name}', '${ex.desc}', '${ex.sets}', '${ex.type}')">
          <i class="fa-solid fa-play"></i>
        </button>
      </li>
    `;
  });

  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const dashOffset = 144 - (144 * progressPct) / 100;

  container.innerHTML = `
    <div class="workout-card glass">
      <div class="workout-card-header">
        <div>
          <span style="font-size:0.75rem; color:var(--accent-1); text-transform:uppercase; font-weight:600;">Today's Focus</span>
          <h3>${todayRoutine.type}</h3>
        </div>
        <div class="progress-ring-container">
          <svg class="progress-ring-svg">
            <circle class="progress-ring-circle" cx="25" cy="25" r="23"></circle>
            <circle class="progress-ring-value" id="mainRing" cx="25" cy="25" r="23" stroke-dasharray="144.5" stroke-dashoffset="${dashOffset}"></circle>
          </svg>
          <div class="progress-text" id="mainPct">${progressPct}%</div>
        </div>
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary);">${todayRoutine.desc}</p>
      <ul class="step-list" id="homeStepsList">${stepsHTML}</ul>
    </div>
  `;
}

window.toggleStep = function(e, idx, totalCount) {
  const li = e.currentTarget.closest('.step-item');
  const prog = getDailyProgress(todayStr);
  
  if (li.classList.contains('checked')) {
    li.classList.remove('checked');
    prog[idx] = false;
  } else {
    li.classList.add('checked');
    prog[idx] = true;
  }
  
  saveDailyProgress(todayStr, prog);
  
  let newCount = 0;
  for(let i=0; i<totalCount; i++) if (prog[i]) newCount++;
  
  const newPct = Math.round((newCount / totalCount) * 100);
  document.getElementById('mainRing').style.strokeDashoffset = 144 - (144 * newPct) / 100;
  document.getElementById('mainPct').innerText = `${newPct}%`;

  if (newPct === 100 && appState.lastCompletedDate !== todayStr) {
    completeWorkoutDay();
    showToast("Workout Complete! Streak updated 🔥");
  }
}

function completeWorkoutDay() {
  appState.streak += 1;
  appState.bestStreak = Math.max(appState.bestStreak, appState.streak);
  appState.totalWorkouts += 1;
  appState.lastCompletedDate = todayStr;
  if (!appState.workoutDates.includes(todayStr)) {
    appState.workoutDates.push(todayStr);
  }
  saveState(appState);
  document.getElementById('streakCount').innerText = `${appState.streak} Days`;
}

// -----------------------------------------
// DAILY TARGETS LOGIC
// -----------------------------------------
window.logWater = function() {
  appState.water = Math.min((appState.water || 0) + 0.5, 4);
  saveState(appState); updateDailyTargetsUI(); showToast('+0.5L Water Logged');
}
window.logSteps = function() {
  appState.steps = Math.min((appState.steps || 0) + 1000, 10000);
  saveState(appState); updateDailyTargetsUI(); showToast('+1000 Steps Logged');
}
window.logSleep = function() {
  appState.sleep = Math.min((appState.sleep || 0) + 1, 8);
  saveState(appState); updateDailyTargetsUI(); showToast('+1 hr Sleep Logged');
}
function updateDailyTargetsUI() {
  const w = appState.water || 0, s = appState.steps || 0, sl = appState.sleep || 0;
  document.getElementById('waterVal').innerText = `${w} / 4L`;
  document.getElementById('waterBar').style.width = `${(w/4)*100}%`;
  
  document.getElementById('stepsVal').innerText = `${s} / 10k`;
  document.getElementById('stepsBar').style.width = `${(s/10000)*100}%`;
  
  document.getElementById('sleepVal').innerText = `${sl} / 8h`;
  document.getElementById('sleepBar').style.width = `${(sl/8)*100}%`;
}

// -----------------------------------------
// AUDIO & TTS
// -----------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(type = 'tick') {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  if (type === 'tick') {
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'success') {
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
  }
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.05;
    window.speechSynthesis.speak(msg);
  }
}

// -----------------------------------------
// EXERCISE MODAL LOGIC (TIMERS + TTS)
// -----------------------------------------
let modalExIdx = -1;
let modalSetsNum = 1;
let modalSetsCompleted = 0;
let modalIsResting = false;
let modalIsActive = false;
let modalIsPrep = false;
let modalTimerInterval = null;
let modalTimeLeft = 30;
let modalSetTime = 0;
let modalTargetType = 'reps';
let modalTargetAmount = 0;

window.openExerciseModal = function(idx, name, desc, setsStr, type) {
  modalExIdx = idx;
  document.getElementById('modalTitle').innerText = name;
  document.getElementById('modalDesc').innerText = desc;
  document.getElementById('modalAnim').innerHTML = ANIMATIONS[type] || ANIMATIONS['cardio'];
  
  // Parse sets
  modalSetsNum = 1;
  if (setsStr.includes('3 sets') || setsStr.includes('3×')) modalSetsNum = 3;
  if (setsStr.includes('4 sets') || setsStr.includes('4×')) modalSetsNum = 4;
  if (setsStr.includes('2 sets') || setsStr.includes('2×')) modalSetsNum = 2;
  
  // Parse Target
  modalTargetType = 'reps';
  modalTargetAmount = 0;
  let targetDisplayStr = "";
  if (setsStr.includes('min')) {
    modalTargetType = 'time';
    let match = setsStr.match(/(\d+)(-\d+)?\s*min/);
    if (match) {
      modalTargetAmount = parseInt(match[1]) * 60; // seconds
      targetDisplayStr = `🎯 Target: ${match[1]} Minutes`;
    }
  } else if (setsStr.includes('sec')) {
    modalTargetType = 'time';
    let match = setsStr.match(/(\d+)\s*sec/);
    if (match) {
      modalTargetAmount = parseInt(match[1]);
      targetDisplayStr = `🎯 Target: ${match[1]} Seconds`;
    }
  } else {
    let match = setsStr.match(/(\d+)\s*reps/);
    if (match) {
      modalTargetAmount = parseInt(match[1]);
      targetDisplayStr = `🎯 Target: ${match[1]} Reps`;
    }
  }

  const tDisplay = document.getElementById('modalTargetDisplay');
  if (targetDisplayStr) {
    tDisplay.innerText = targetDisplayStr;
    tDisplay.style.display = 'inline-block';
  } else {
    tDisplay.style.display = 'none';
  }
  
  modalSetsCompleted = 0;
  modalIsResting = false;
  modalIsActive = false;
  modalIsPrep = false;
  clearInterval(modalTimerInterval);
  
  document.getElementById('timerContainer').style.display = 'none';
  document.getElementById('btnActionTimer').innerText = `Start Set 1`;
  document.getElementById('btnActionTimer').className = 'btn-primary';
  document.getElementById('btnActionTimer').disabled = false;
  
  let setsHtml = '';
  for(let i=0; i<modalSetsNum; i++) {
    setsHtml += `<button class="set-pill" id="setPill${i}">Set ${i+1}</button>`;
  }
  document.getElementById('setTracker').innerHTML = setsHtml;
  document.getElementById('setTracker').style.display = 'flex';
  document.getElementById('exerciseModal').style.display = 'flex';
  
  speak(`Next up: ${name}. ${modalSetsNum} sets. ${desc}`);
}

window.handleModalAction = function() {
  if (modalIsPrep) return; // Disable clicking during 3-2-1
  
  if (modalIsResting) {
    // Skip Rest
    endRest();
  } else if (!modalIsActive) {
    // Start Prep (3, 2, 1)
    modalIsPrep = true;
    document.getElementById('setTracker').style.display = 'none';
    document.getElementById('timerContainer').style.display = 'flex';
    document.getElementById('timerLabel').innerText = `GET READY`;
    document.getElementById('timerDisplay').innerText = `3`;
    document.getElementById('btnActionTimer').innerText = `Get Ready...`;
    document.getElementById('btnActionTimer').disabled = true;
    
    let prepCount = 3;
    speak(prepCount.toString());
    playBeep('tick');
    
    modalTimerInterval = setInterval(() => {
      prepCount--;
      if (prepCount > 0) {
        document.getElementById('timerDisplay').innerText = prepCount;
        speak(prepCount.toString());
        playBeep('tick');
      } else {
        clearInterval(modalTimerInterval);
        startSet();
      }
    }, 1000);
  } else {
    // Complete Set
    modalIsActive = false;
    clearInterval(modalTimerInterval);
    document.getElementById(`setPill${modalSetsCompleted}`).classList.add('done');
    modalSetsCompleted++;
    
    if (modalSetsCompleted >= modalSetsNum) {
      playBeep('success');
      speak("Exercise complete! Great job.");
      showToast("Exercise Complete! ✅");
      setTimeout(() => {
        closeExerciseModal();
        const stepEl = document.querySelector(`.step-item[data-idx="${modalExIdx}"] .step-name`);
        if (stepEl && !stepEl.parentElement.classList.contains('checked')) stepEl.click();
      }, 1500);
    } else {
      startRest();
    }
  }
}

function startSet() {
  modalIsPrep = false;
  modalIsActive = true;
  document.getElementById('btnActionTimer').disabled = false;
  document.getElementById('btnActionTimer').innerText = `Complete Set ${modalSetsCompleted + 1}`;
  document.getElementById('timerLabel').innerText = modalTargetType === 'time' ? `TIME REMAINING` : `TIME ELAPSED`;
  
  speak("Go!");
  playBeep('success');
  
  if (modalTargetType === 'time') {
    modalSetTime = modalTargetAmount; // Countdown
  } else {
    modalSetTime = 0; // Stopwatch
  }
  updateTimerDisplay(modalSetTime);
  
  modalTimerInterval = setInterval(() => {
    if (modalTargetType === 'time') {
      modalSetTime--;
      if (modalSetTime <= 0) {
        // Auto complete set when time is up
        handleModalAction();
        return;
      }
      if (modalSetTime <= 3) playBeep('tick');
    } else {
      modalSetTime++;
    }
    updateTimerDisplay(modalSetTime);
  }, 1000);
}

function updateTimerDisplay(totalSeconds) {
  let m = Math.floor(totalSeconds / 60);
  let s = totalSeconds % 60;
  document.getElementById('timerDisplay').innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

function startRest() {
  modalIsResting = true;
  modalIsActive = false;
  modalTimeLeft = 30; // 30s rest
  
  document.getElementById('setTracker').style.display = 'none';
  document.getElementById('timerContainer').style.display = 'flex';
  document.getElementById('timerLabel').innerText = `Resting (${modalSetsNum - modalSetsCompleted} sets left)`;
  document.getElementById('timerDisplay').innerText = `00:${modalTimeLeft}`;
  document.getElementById('btnActionTimer').innerText = `Skip Rest`;
  document.getElementById('btnActionTimer').className = 'btn-danger';
  
  speak(`Set complete. Rest for 30 seconds. You have ${modalSetsNum - modalSetsCompleted} sets remaining.`);
  
  modalTimerInterval = setInterval(() => {
    modalTimeLeft--;
    let displaySec = modalTimeLeft < 10 ? `0${modalTimeLeft}` : modalTimeLeft;
    document.getElementById('timerDisplay').innerText = `00:${displaySec}`;
    
    if (modalTimeLeft <= 3 && modalTimeLeft > 0) {
      playBeep('tick');
    }
    
    if (modalTimeLeft <= 0) {
      endRest();
    }
  }, 1000);
}

function endRest() {
  clearInterval(modalTimerInterval);
  modalIsResting = false;
  modalIsActive = false;
  
  document.getElementById('timerContainer').style.display = 'none';
  document.getElementById('setTracker').style.display = 'flex';
  document.getElementById('btnActionTimer').innerText = `Start Set ${modalSetsCompleted + 1}`;
  document.getElementById('btnActionTimer').className = 'btn-primary';
  
  playBeep('success');
  speak(`Ready for set ${modalSetsCompleted + 1}!`);
}

window.closeExerciseModal = function() { 
  clearInterval(modalTimerInterval);
  window.speechSynthesis.cancel();
  document.getElementById('exerciseModal').style.display = 'none'; 
}
window.closeModal = function(e) { 
  if(e.target === document.getElementById('exerciseModal')) closeExerciseModal(); 
}

// -----------------------------------------
// SCHEDULE
// -----------------------------------------
function renderSchedule() {
  const list = document.getElementById('scheduleList');
  const routine = routines[appState.mode];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayNum = new Date().getDay();

  let html = '';
  routine.forEach((dayPlan, i) => {
    const isToday = i === todayNum;
    let exHtml = '';
    if (dayPlan.exercises.length > 0) {
      exHtml = '<ul style="list-style:inside; font-size:0.9rem; color:var(--text-secondary); margin-top:10px; display:flex; flex-direction:column; gap:5px;">';
      dayPlan.exercises.forEach((ex, idx) => {
        exHtml += `<li style="cursor:pointer;" onclick="openExerciseModal(${idx}, '${ex.name}', '${ex.desc}', '${ex.sets}', '${ex.type}')">${ex.name}</li>`;
      });
      exHtml += '</ul>';
    }
    html += `
      <div class="accordion-item glass ${isToday ? 'today' : ''}">
        <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
          <div>
            <h4>${days[i]} ${isToday ? '(Today)' : ''}</h4>
            <div class="workout-tag">${dayPlan.type}</div>
          </div>
          <i class="fa-solid fa-chevron-down chevron"></i>
        </div>
        <div class="accordion-body">
          <p style="font-size:0.9rem;">${dayPlan.desc}</p>
          ${exHtml}
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

// -----------------------------------------
// PROGRESS PAGE LOGIC
// -----------------------------------------
function renderProgressPage() {
  // Records
  document.getElementById('pr-streak').innerText = `${appState.bestStreak}`;
  document.getElementById('pr-total').innerText = appState.totalWorkouts;
  
  // BMI Calculation
  let currentWeight = parseFloat(appState.weight) || 0;
  const latestWeightLog = appState.logs.find(l => l.weight);
  if (latestWeightLog && !currentWeight) {
    currentWeight = parseFloat(latestWeightLog.weight);
  }

  if (currentWeight && appState.height) {
    const hM = appState.height / 100;
    const bmi = (currentWeight / (hM * hM)).toFixed(1);
    document.getElementById('pr-weight').innerText = bmi;
    
    let category = '';
    let color = '';
    if (bmi < 18.5) { category = 'Underweight'; color = '#3498db'; }
    else if (bmi >= 18.5 && bmi < 25) { category = 'Normal'; color = '#2ed573'; }
    else if (bmi >= 25 && bmi < 30) { category = 'Overweight'; color = '#f39c12'; }
    else { category = 'Obese'; color = '#e74c3c'; }
    
    document.getElementById('bmiCategory').innerText = category;
    document.getElementById('bmiCategory').style.color = color;
  } else {
    document.getElementById('pr-weight').innerText = "--";
    document.getElementById('bmiCategory').innerText = "Update Settings";
    document.getElementById('bmiCategory').style.color = 'var(--text-secondary)';
  }

  // Goal Tracker Calculation
  const targetW = parseFloat(appState.targetWeight);
  if (currentWeight && targetW) {
    document.getElementById('goalCurrent').innerText = `${currentWeight} kg`;
    document.getElementById('goalTarget').innerText = `${targetW} kg`;
    
    const diff = Math.abs(currentWeight - targetW);
    // Assuming safe weight loss/gain is ~0.5kg per week
    const weeksToGoal = Math.ceil(diff / 0.5);
    
    document.getElementById('goalEstimate').innerText = diff === 0 
      ? "Goal Achieved! 🎉" 
      : `${diff.toFixed(1)} kg to go. Estimated time: ~${weeksToGoal} weeks.`;
    
    // Calculate simple progress % based on a hypothetical starting point of 10kg difference, just for visual
    // Better: We need a starting weight to calculate true percentage. If not available, just show 50% or arbitrary.
    let startWeight = appState.logs.length > 0 ? parseFloat(appState.logs[appState.logs.length-1].weight) : null;
    if (!startWeight) startWeight = currentWeight + (currentWeight > targetW ? 10 : -10); // fake start if none
    
    const totalDiff = Math.abs(startWeight - targetW);
    const currentDiff = Math.abs(currentWeight - targetW);
    let progressPct = 100;
    if (totalDiff > 0) {
      progressPct = Math.max(0, Math.min(100, ((totalDiff - currentDiff) / totalDiff) * 100));
    }
    
    document.getElementById('goalBar').style.width = `${progressPct}%`;
  } else {
    document.getElementById('goalCurrent').innerText = "-- kg";
    document.getElementById('goalTarget').innerText = "-- kg";
    document.getElementById('goalEstimate').innerText = "Set your current and dream weight in Settings.";
    document.getElementById('goalBar').style.width = "0%";
  }

  renderWeightChart();
  renderWeekChart();
  renderFullCalendar();
  renderPhotos();
}

let currentChartTimeframe = 'week';

window.setChartTimeframe = function(frame) {
  currentChartTimeframe = frame;
  document.getElementById('btnChartWeek').style.background = frame === 'week' ? 'var(--accent-1)' : 'transparent';
  document.getElementById('btnChartWeek').style.color = frame === 'week' ? '#fff' : '#888';
  document.getElementById('btnChartMonth').style.background = frame === 'month' ? 'var(--accent-1)' : 'transparent';
  document.getElementById('btnChartMonth').style.color = frame === 'month' ? '#fff' : '#888';
  renderWeightChart();
}

function renderWeightChart() {
  const canvas = document.getElementById('customWeightCanvas');
  if (!canvas) return;
  
  // Set target weight text
  const targetW = parseFloat(appState.targetWeight) || 0;
  document.getElementById('customGoalText').innerText = targetW ? `${targetW.toFixed(1)} kg` : '-- kg';
  
  // Get all logs with weight and sort chronologically
  const wLogs = appState.logs.filter(l => l.weight).sort((a,b) => a.timestamp - b.timestamp);
  const currentW = parseFloat(appState.weight) || (wLogs.length ? parseFloat(wLogs[wLogs.length-1].weight) : 0);
  
  // Filter logs based on timeframe
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let filteredLogs = [];
  let startDateMs = 0;
  
  if (currentChartTimeframe === 'week') {
    startDateMs = now - (6 * dayMs); // past 7 days (including today)
    filteredLogs = wLogs.filter(l => l.timestamp >= startDateMs);
  } else {
    startDateMs = now - (29 * dayMs); // past 30 days
    filteredLogs = wLogs.filter(l => l.timestamp >= startDateMs);
  }
  
  // If no logs in timeframe, just show what we have, or mock for aesthetic preview
  let renderData = [];
  if (filteredLogs.length > 0) {
    renderData = filteredLogs.map(l => ({ val: parseFloat(l.weight), ts: l.timestamp, date: l.date }));
  } else if (wLogs.length > 0) {
    renderData = wLogs.map(l => ({ val: parseFloat(l.weight), ts: l.timestamp, date: l.date }));
    startDateMs = renderData[0].ts; // expand to fit whatever we have
  }
  
  // Update Pills based on filtered data start
  if (renderData.length >= 2) {
    const firstW = renderData[0].val;
    const diff = (currentW - firstW).toFixed(1);
    const dateParts = new Date(renderData[0].ts).toDateString().split(' ');
    const shortDate = `${dateParts[2]} ${dateParts[1]}`; // e.g. 10 Sep
    const isGain = diff > 0;
    
    document.getElementById('weightPillDiff').innerHTML = `${isGain ? '+' : ''}${diff} kg vs ${shortDate} ${isGain ? '▲' : '▼'}`;
    document.getElementById('weightPillDiff').style.color = isGain ? '#e74c3c' : '#2ecc71';
    document.getElementById('weightPillDiff').style.background = isGain ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)';
  } else {
    document.getElementById('weightPillDiff').innerHTML = `-- kg`;
    document.getElementById('weightPillDiff').style.color = '#888';
    document.getElementById('weightPillDiff').style.background = 'rgba(255,255,255,0.05)';
  }
  
  if (targetW && currentW) {
    const behind = (currentW - targetW).toFixed(1);
    document.getElementById('weightPillPlan').innerText = `${Math.abs(behind)} kg ${behind > 0 ? 'behind' : 'ahead of'} plan`;
  }
  
  // Canvas Setup for high DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Mock data if absolutely empty so the UI doesn't look broken
  if (renderData.length === 0) {
    renderData = [
      { val: 87.1, ts: now - 3*dayMs, date: '1' },
      { val: 85.5, ts: now - 1*dayMs, date: '2' },
      { val: 86.2, ts: now, date: '3' }
    ];
    startDateMs = now - 3*dayMs;
  }
  
  // Calculate Min/Max Y exactly
  let vals = renderData.map(d => d.val);
  if (targetW) vals.push(targetW);
  
  let rawMin = Math.min(...vals);
  let rawMax = Math.max(...vals);
  if (rawMin === rawMax) { rawMin -= 2; rawMax += 2; }
  
  const minW = Math.floor(rawMin - 1);
  const maxW = Math.ceil(rawMax + 1);
  
  const padBottom = 30;
  const padLeft = 35;
  const graphW = w - padLeft - 30; // leave room on right for Goal point
  const graphH = h - padBottom - 20; // leave room on top
  
  // Y Axis ticks (4 ticks evenly spaced)
  ctx.fillStyle = '#888';
  ctx.font = '11px Outfit';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  for(let i=0; i<4; i++) {
    const val = maxW - (i * ((maxW - minW) / 3));
    const y = 20 + (i * (graphH / 3));
    
    ctx.fillText(val.toFixed(1), padLeft - 8, y);
    // Grid line
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // X Axis setup
  const totalDuration = now - startDateMs;
  // We project the X axis out to the right slightly (by 25%) to fit the 'Goal' point if needed
  const projectedEndMs = now + (totalDuration * 0.25 || dayMs * 2);
  const graphDuration = projectedEndMs - startDateMs;
  
  const getXY = (ts, val) => {
    let pctX = (ts - startDateMs) / graphDuration;
    // Cap pctX visually if it goes crazy, but it shouldn't
    if (pctX < 0) pctX = 0; if (pctX > 1) pctX = 1;
    
    const posX = padLeft + (pctX * graphW);
    const posY = 20 + graphH - ((val - minW) / (maxW - minW)) * graphH;
    return {x: posX, y: posY};
  };
  
  // Draw X Axis labels (Start, Middle, Today)
  ctx.textAlign = 'center';
  const midTs = startDateMs + (totalDuration / 2);
  const formatShort = (ms) => {
    const p = new Date(ms).toDateString().split(' ');
    return `${p[2]} ${p[1]}`;
  };
  
  [startDateMs, midTs, now].forEach(ts => {
    const x = getXY(ts, minW).x;
    ctx.fillText(formatShort(ts), x, h - 5);
  });
  
  // Today line (vertical dashed red)
  const todayP = getXY(now, minW);
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 1;
  ctx.moveTo(todayP.x, 20);
  ctx.lineTo(todayP.x, h - padBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e74c3c';
  ctx.font = '11px Outfit';
  ctx.fillText('Today', todayP.x, 10);
  
  // Draw Goal Dashed Line (from first actual point to projected goal point on far right)
  if (targetW && renderData.length > 0) {
    const startP = getXY(renderData[0].ts, renderData[0].val);
    const endP = getXY(projectedEndMs, targetW);
    
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.moveTo(startP.x, startP.y);
    ctx.lineTo(endP.x, endP.y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Goal point & text
    ctx.beginPath();
    ctx.arc(endP.x, endP.y, 4, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.font = 'bold 12px Outfit';
    ctx.fillText('Goal', endP.x, endP.y - 10);
  }
  
  // Draw Solid White Line (Actual Data) up to 'Today'
  if (renderData.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    
    let lastActualP = null;
    renderData.forEach((d, i) => {
      const p = getXY(d.ts, d.val);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
      lastActualP = p;
    });
    ctx.stroke();
    
    // Fill under solid line (gradient)
    const fillGradient = ctx.createLinearGradient(0, 0, 0, graphH + 20);
    fillGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    fillGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    
    ctx.lineTo(lastActualP.x, h - padBottom);
    ctx.lineTo(getXY(renderData[0].ts, minW).x, h - padBottom);
    ctx.fillStyle = fillGradient;
    ctx.fill();
    
    // Draw points on solid line
    renderData.forEach((d, i) => {
      const p = getXY(d.ts, d.val);
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === renderData.length - 1 ? 5 : 3.5, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      
      // Last point gets a red stroke
      if (i === renderData.length - 1) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e74c3c';
        ctx.stroke();
      }
    });
  }
}

function renderWeekChart() {
  const days = ['M','T','W','T','F','S','S'];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  let barsHtml = '', labelsHtml = '';
  for(let i=0; i<7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const isDone = appState.workoutDates.includes(d.toDateString());
    const isToday = d.toDateString() === today.toDateString();
    const h = isDone ? 100 : (isToday ? 20 : 5);
    const cls = isDone ? 'active' : '';
    barsHtml += `<div class="chart-bar ${cls}" style="height:${h}%"></div>`;
    labelsHtml += `<span>${days[i]}</span>`;
  }
  document.getElementById('weekChart').innerHTML = barsHtml;
  document.getElementById('weekChartLabels').innerHTML = labelsHtml;
}

function renderFullCalendar() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('calMonthLabel').textContent = `${months[calViewMonth]} ${calViewYear}`;
  
  const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Start Monday
  const daysInMonth = new Date(calViewYear, calViewMonth+1, 0).getDate();
  const todayStr = new Date().toDateString();
  
  let html = '';
  for(let i=0; i<offset; i++) html += '<div class="cal-day empty"></div>';
  for(let d=1; d<=daysInMonth; d++) {
    const date = new Date(calViewYear, calViewMonth, d);
    const ds = date.toDateString();
    const isToday = ds === todayStr;
    const isDone = appState.workoutDates.includes(ds);
    const cls = isToday ? 'today' : isDone ? 'done' : '';
    html += `<div class="cal-day ${cls}">${d}</div>`;
  }
  document.getElementById('fullCalendar').innerHTML = html;
}

window.changeMonth = function(dir) {
  calViewMonth += dir;
  if(calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  if(calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
  renderFullCalendar();
}

// -----------------------------------------
// LOGS LOGIC (Daily well-being & weight)
// -----------------------------------------
function saveLog() {
  const w = document.getElementById('logWeight').value;
  const e = document.getElementById('sliderEnergy').value;
  const s = document.getElementById('sliderSoreness').value;
  const sl = document.getElementById('sliderSleep').value;
  const notes = document.getElementById('logNotes').value;

  const logEntry = {
    date: getTodayStr(),
    weight: w,
    energy: e,
    soreness: s,
    sleep: sl,
    notes: notes,
    timestamp: Date.now()
  };

  appState.logs.unshift(logEntry);
  
  // Auto-update current weight in settings if provided
  if (w) {
    appState.weight = w;
    const wInput = document.getElementById('settingWeight');
    if (wInput) wInput.value = w;
  }
  
  saveState(appState);
  
  document.getElementById('logWeight').value = '';
  document.getElementById('sliderEnergy').value = 5; document.getElementById('valEnergy').innerText = 5;
  document.getElementById('sliderSoreness').value = 5; document.getElementById('valSoreness').innerText = 5;
  document.getElementById('sliderSleep').value = 5; document.getElementById('valSleep').innerText = 5;
  document.getElementById('logNotes').value = '';

  showToast("Log Saved!");
  renderLogs();
}

function renderLogs() {
  const list = document.getElementById('historyLogList');
  if (appState.logs.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No logs yet.</p>';
    return;
  }

  let html = '';
  appState.logs.forEach(log => {
    html += `
      <div class="history-item">
        <div class="history-date">
          <span>${log.date}</span>
          ${log.weight ? `<strong>${log.weight} kg</strong>` : ''}
        </div>
        <div class="history-metrics">
          <span>Energy: <strong>${log.energy}/10</strong></span>
          <span>Soreness: <strong>${log.soreness}/10</strong></span>
          <span>Sleep: <strong>${log.sleep}/10</strong></span>
        </div>
        ${log.notes ? `<div class="history-notes">"${log.notes}"</div>` : ''}
      </div>
    `;
  });
  list.innerHTML = html;
}

// -----------------------------------------
// PHOTOS LOGIC
// -----------------------------------------
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    await db.photos.add({ date: getTodayStr(), image: event.target.result, timestamp: Date.now() });
    showToast("Photo saved!");
    if (document.getElementById('view-progress').classList.contains('active')) {
      renderPhotos();
    }
  };
  reader.readAsDataURL(file);
}

async function renderPhotos() {
  const grid = document.getElementById('photoGrid');
  const photos = await db.photos.orderBy('timestamp').reverse().toArray();
  
  if (photos.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-secondary);">No photos yet.</p>';
    return;
  }

  let html = '';
  photos.forEach(p => {
    html += `
      <div class="photo-card">
        <img src="${p.image}" alt="Progress">
        <div class="photo-date">${p.date}</div>
        <div class="photo-delete" onclick="deletePhoto(${p.id})"><i class="fa-solid fa-trash" style="font-size:0.75rem; color:#fff;"></i></div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

window.deletePhoto = async function(id) {
  if (confirm('Delete this progress photo?')) {
    await db.photos.delete(id);
    renderPhotos();
  }
}

// -----------------------------------------
// AI COACH (GEMINI API)
// -----------------------------------------
let chatHistory = [];

window.openChatModal = function() {
  document.getElementById('chatModal').style.display = 'flex';
}
window.closeChatModal = function(e) {
  if (e && e.target !== document.getElementById('chatModal')) return;
  document.getElementById('chatModal').style.display = 'none';
}
window.handleChatKey = function(e) {
  if (e.key === 'Enter') sendChat();
}

window.sendChat = async function() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  
  input.value = '';
  addChatMsg('user', msg);
  
  if (!appState.apiKey) {
    setTimeout(() => {
      addChatMsg('ai', '⚠️ Please add your Gemini API Key in the Settings tab to chat with me!');
    }, 500);
    return;
  }

  chatHistory.push({ role: 'user', parts: [{ text: msg }] });
  const thinkingId = addThinking();

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appState.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatHistory,
        systemInstruction: {
          parts: [{ text: "You are FiitSync AI, a highly encouraging and scientifically accurate personal trainer. Keep answers very short (1-3 sentences) and highly actionable. Use emojis." }]
        }
      })
    });
    
    document.getElementById(thinkingId).remove();
    
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    const reply = data.candidates[0].content.parts[0].text;
    
    addChatMsg('ai', reply);
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });

  } catch(e) {
    document.getElementById(thinkingId).remove();
    addChatMsg('ai', '🔌 Connection issue or invalid API Key. Please check your settings!');
  }
}

function addChatMsg(role, text) {
  const msgs = document.getElementById('chatMessages');
  const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="bubble">${text.replace(/\n/g,'<br>')}</div><div class="time">${now}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addThinking() {
  const msgs = document.getElementById('chatMessages');
  const id = 'thinking-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-msg ai';
  div.innerHTML = `<div class="bubble"><div class="ai-thinking"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

// Helpers
window.showToast = function(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// -----------------------------------------
// PWA INSTALLATION LOGIC (A2HS)
// -----------------------------------------
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const btnInstallAccept = document.getElementById('btnInstallAccept');
const btnInstallDismiss = document.getElementById('btnInstallDismiss');
const btnSettingsInstall = document.getElementById('btnSettingsInstall');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  if (installPrompt && !appState.installPromptDismissed) {
    installPrompt.classList.remove('hidden');
  }
});

const handleInstall = async () => {
  if (!deferredPrompt) {
    // If install prompt is not available, act as a Force Update button
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.update());
      });
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
      showToast("Updating app to latest version...");
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    } else {
      window.location.reload(true);
    }
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  deferredPrompt = null;
  if (installPrompt) installPrompt.classList.add('hidden');
};

if (btnInstallAccept) {
  btnInstallAccept.addEventListener('click', handleInstall);
}

if (btnSettingsInstall) {
  btnSettingsInstall.addEventListener('click', handleInstall);
}

if (btnInstallDismiss) {
  btnInstallDismiss.addEventListener('click', () => {
    installPrompt.classList.add('hidden');
    appState.installPromptDismissed = true;
    saveState(appState);
  });
}

window.addEventListener('appinstalled', () => {
  if (installPrompt) installPrompt.classList.add('hidden');
  deferredPrompt = null;
  console.log('PWA was installed');
  showToast("App Installed Successfully!");
});


