/**
 * MindZen: Core Application Logic Engine
 * Includes Auth, State Management, Stress Analysis, Web Audio Synth,
 * Breathing Pace Timers, Aura Advisor Chat, SVG Charts, and Settings.
 */

// -------------------------------------------------------------
// I. INITIAL STATE & CONFIGURATION
// -------------------------------------------------------------
const CONFIG = {
  MOCK_USER: 'Sunirban',
  MOCK_PASS: 'SampleAI',
  KEYWORDS: {
    fatigue: [
      'sleep', 'tired', 'exhausted', 'fatigue', 'insomnia', 'awake', 'nightmare', 
      'restless', 'sleepiness', 'headache', 'dizzy', 'strain', 'back pain', 'eyes hurt',
      'stiff', 'neck', 'rest', 'weak', 'drained', 'no energy', 'yawn'
    ],
    imposter: [
      'fail', 'not good enough', 'stupid', 'useless', 'fraud', 'behind', 'better than me',
      'smarter', 'talentless', 'worthless', 'disappointing', 'give up', 'hopeless', 
      'everyone else', 'never pass', 'impossible', 'dumb', 'loser', 'blame'
    ],
    anxiety: [
      'anxious', 'panic', 'heart racing', 'blank', 'forgetting', 'syllabus', 'mock test',
      'cutoff', 'percentile', 'score', 'marks', 'rank', 'stress', 'fear', 'nervous',
      'timer', 'exam pressure', 'worry', 'scared', 'pre-exam', 'preparation'
    ],
    pressure: [
      'parents', 'coaching', 'expectations', 'isolate', 'alone', 'father', 'mother', 
      'teacher', 'society', 'comparisons', 'relative', 'peer pressure', 'lonely', 
      'no friends', 'locked up', 'study room', 'pressure'
    ],
    distress: [
      'suicide', 'die', 'kill myself', 'self-harm', 'end my life', 'hopelessness',
      'better off dead', 'cutting', 'no way out', 'quit life', 'hanging'
    ]
  }
};

let STATE = {
  isLoggedIn: false,
  currentUser: '',
  streak: 0,
  activeExam: 'UPSC',
  prepStage: 'Mid Prep',
  logs: [], // Array of log objects
  settings: {
    anonymize: false,
    ttsEnabled: true,
    ttsSpeed: 1.0,
    fontSize: 16,
    highContrast: false
  }
};

// -------------------------------------------------------------
// II. AUDIO SYNTHESIZER MANAGER (WEB AUDIO API)
// -------------------------------------------------------------
function startVisualizerLoop(analyser, dataArray, bufferLength) {
  const canvas = document.getElementById('audio-visualizer-canvas');
  if (!canvas) return;
  const canvasCtx = canvas.getContext('2d');
  
  let animationId = null;
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteTimeDomainData(dataArray);
    
    // Clear canvas with trail blur
    canvasCtx.fillStyle = 'rgba(10, 12, 22, 0.2)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line if no active sounds are playing
    let activeSound = false;
    for(let i=0; i<bufferLength; i++) {
      if(Math.abs(dataArray[i] - 128) > 1) {
        activeSound = true;
        break;
      }
    }
    
    canvasCtx.lineWidth = 3;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#6474e6';
    canvasCtx.strokeStyle = primaryColor;
    canvasCtx.beginPath();
    
    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      
      // If quiet, add a tiny mock micro-oscillation to represent peaceful presence
      if (!activeSound) {
        v += Math.sin(i * 0.15 + Date.now() * 0.002) * 0.015;
      }
      
      const y = v * canvas.height / 2;
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  
  draw();
}

class WellnessSynthManager {
  constructor() {
    this.ctx = null;
    this.sources = {
      binaural: null,
      rain: null,
      brown: null
    };
    this.nodes = {
      masterVolume: null,
      rainFilter: null
    };
    this.isPlaying = {
      binaural: false,
      rain: false,
      brown: false
    };
    this.analyser = null;
    this.analyserBufferLength = 0;
    this.analyserDataArray = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master Volume Node
    this.nodes.masterVolume = this.ctx.createGain();
    this.nodes.masterVolume.gain.value = parseFloat(document.getElementById('synth-volume').value) || 0.5;
    
    // Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyserBufferLength = this.analyser.frequencyBinCount;
    this.analyserDataArray = new Uint8Array(this.analyserBufferLength);
    
    // Connect master -> analyser -> destination
    this.nodes.masterVolume.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    startVisualizerLoop(this.analyser, this.analyserDataArray, this.analyserBufferLength);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    this.init();
    if (this.nodes.masterVolume) {
      this.nodes.masterVolume.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setRainFilterFreq(val) {
    if (this.nodes.rainFilter) {
      this.nodes.rainFilter.frequency.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  toggleBinaural() {
    this.init();
    this.resume();

    if (this.isPlaying.binaural) {
      this.stopTrack('binaural');
      return false;
    }

    // Create left & right oscillators for 4Hz Delta beat
    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(140, this.ctx.currentTime);

    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(144, this.ctx.currentTime);

    const gainL = this.ctx.createGain();
    gainL.gain.setValueAtTime(0.35, this.ctx.currentTime);

    const gainR = this.ctx.createGain();
    gainR.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Pan L & R
    const pannerL = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const pannerR = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    if (pannerL && pannerR) {
      pannerL.pan.setValueAtTime(-1, this.ctx.currentTime);
      pannerR.pan.setValueAtTime(1, this.ctx.currentTime);
      
      oscL.connect(gainL).connect(pannerL).connect(this.nodes.masterVolume);
      oscR.connect(gainR).connect(pannerR).connect(this.nodes.masterVolume);
    } else {
      oscL.connect(gainL).connect(this.nodes.masterVolume);
      oscR.connect(gainR).connect(this.nodes.masterVolume);
    }

    oscL.start();
    oscR.start();

    this.sources.binaural = { oscL, oscR, gainL, gainR };
    this.isPlaying.binaural = true;
    return true;
  }

  toggleBrownNoise() {
    this.init();
    this.resume();

    if (this.isPlaying.brown) {
      this.stopTrack('brown');
      return false;
    }

    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Amplify
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; // Rumble filter

    noiseNode.connect(filter).connect(this.nodes.masterVolume);
    noiseNode.start();

    this.sources.brown = noiseNode;
    this.isPlaying.brown = true;
    return true;
  }

  toggleRain() {
    this.init();
    this.resume();

    if (this.isPlaying.rain) {
      this.stopTrack('rain');
      return false;
    }

    // Generate Pink/Brownish noise buffer
    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise approximation filter
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      output[i] = pink * 0.11; // Normalize gain
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    // Connect custom dynamic rain Filter
    this.nodes.rainFilter = this.ctx.createBiquadFilter();
    this.nodes.rainFilter.type = 'bandpass';
    this.nodes.rainFilter.frequency.value = parseFloat(document.getElementById('rain-intensity').value) || 800;
    this.nodes.rainFilter.Q.value = 1.2;

    rainSource.connect(this.nodes.rainFilter).connect(this.nodes.masterVolume);
    rainSource.start();

    this.sources.rain = rainSource;
    this.isPlaying.rain = true;
    return true;
  }

  stopTrack(track) {
    if (!this.isPlaying[track]) return;
    
    if (track === 'binaural' && this.sources.binaural) {
      this.sources.binaural.oscL.stop();
      this.sources.binaural.oscR.stop();
      this.sources.binaural.oscL.disconnect();
      this.sources.binaural.oscR.disconnect();
      this.sources.binaural = null;
    } else if (this.sources[track]) {
      this.sources[track].stop();
      this.sources[track].disconnect();
      this.sources[track] = null;
    }

    this.isPlaying[track] = false;
  }

  stopAll() {
    this.stopTrack('binaural');
    this.stopTrack('brown');
    this.stopTrack('rain');
  }
}

const AudioSynth = new WellnessSynthManager();

// -------------------------------------------------------------
// III. CORE JOURNAL & MOOD ANALYZER ENGINE
// -------------------------------------------------------------
function analyzeTextLogs(text, mood) {
  const cleanText = text.toLowerCase();
  
  let matchCounts = {
    fatigue: 0,
    imposter: 0,
    anxiety: 0,
    pressure: 0,
    distress: 0
  };

  // Count keyword frequencies
  Object.keys(CONFIG.KEYWORDS).forEach(category => {
    CONFIG.KEYWORDS[category].forEach(word => {
      // Use regex to match exact bounds or simple substrings safely
      const matches = cleanText.split(word).length - 1;
      matchCounts[category] += matches;
    });
  });

  // Calculate scores (0 to 100)
  // Scale factor: having 3 or more keywords signals high density (100%)
  const calculateScore = (count) => Math.min(100, Math.round((count / 3) * 100));
  
  let fatigue = calculateScore(matchCounts.fatigue);
  let imposter = calculateScore(matchCounts.imposter);
  let anxiety = calculateScore(matchCounts.anxiety);
  let pressure = calculateScore(matchCounts.pressure);
  
  // Adjust based on explicit mood logging
  if (mood === 'burntout') {
    fatigue = Math.max(fatigue, 80);
    imposter = Math.max(imposter, 70);
  } else if (mood === 'stressed') {
    anxiety = Math.max(anxiety, 75);
  } else if (mood === 'tired') {
    fatigue = Math.max(fatigue, 85);
  } else if (mood === 'calm') {
    // Dampen stressors slightly if the user actively reports feeling calm
    fatigue = Math.round(fatigue * 0.7);
    anxiety = Math.round(anxiety * 0.6);
  }

  // Final aggregate Burnout Risk Score
  const burnoutScore = Math.min(100, Math.round((fatigue * 0.35) + (anxiety * 0.3) + (imposter * 0.2) + (pressure * 0.15)));
  
  // Safety Distress Crisis Trigger
  const isCrisis = matchCounts.distress > 0;

  return {
    scores: { fatigue, imposter, anxiety, pressure },
    burnout: burnoutScore,
    isCrisis: isCrisis
  };
}

// -------------------------------------------------------------
// IV. SPEECH SYNTHESIS NARRATION SERVICE
// -------------------------------------------------------------
function speakOutLoud(text) {
  if (!STATE.settings.ttsEnabled || !('speechSynthesis' in window)) return;
  
  // Cancel previous speech playing
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = STATE.settings.ttsSpeed;
  utterance.pitch = 1.0;
  
  // Try to find a calming local system voice if available
  const voices = window.speechSynthesis.getVoices();
  const calmingVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang === 'en-IN');
  if (calmingVoice) utterance.voice = calmingVoice;

  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------
// V. STREAKS, BADGES, AND LOG HISTORY
// -------------------------------------------------------------
function updateStreakCount() {
  if (STATE.logs.length === 0) {
    STATE.streak = 0;
    return;
  }

  // Sort logs by date ascending
  const sorted = [...STATE.logs].sort((a,b) => new Date(a.date) - new Date(b.date));
  let tempStreak = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i-1].date);
    const currDate = new Date(sorted[i].date);
    
    // Calculate difference in calendar days
    const diffTime = Math.abs(currDate.setHours(0,0,0,0) - prevDate.setHours(0,0,0,0));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else if (diffDays > 1) {
      tempStreak = 1; // broken streak reset
    }
    // if diffDays === 0, it means logged on same day, streak doesn't change
  }
  
  STATE.streak = tempStreak;
}

function checkAndUnlockBadges() {
  const badgeFirst = document.getElementById('badge-first-step');
  const badgeZen = document.getElementById('badge-mindful-breather');
  const badgeStreak = document.getElementById('badge-consistency');
  const badgeImposter = document.getElementById('badge-courageous');

  let unlockedCount = 0;

  // 1. First Step Badge
  if (STATE.logs.length >= 1) {
    badgeFirst.classList.remove('locked');
    badgeFirst.classList.add('unlocked');
    unlockedCount++;
  } else {
    badgeFirst.classList.add('locked');
    badgeFirst.classList.remove('unlocked');
  }

  // 2. Zen Breather (completed when user starts breathing session)
  const breathState = localStorage.getItem('mindzen_breath_done') === 'true';
  if (breathState) {
    badgeZen.classList.remove('locked');
    badgeZen.classList.add('unlocked');
    unlockedCount++;
  } else {
    badgeZen.classList.add('locked');
    badgeZen.classList.remove('unlocked');
  }

  // 3. Streak Star (3 log days)
  if (STATE.streak >= 3) {
    badgeStreak.classList.remove('locked');
    badgeStreak.classList.add('unlocked');
    unlockedCount++;
  } else {
    badgeStreak.classList.add('locked');
    badgeStreak.classList.remove('unlocked');
  }

  // 4. Imposter Shield (User identified imposter and reviewed suggestions)
  const hasHighImposter = STATE.logs.some(log => log.scores.imposter >= 60);
  if (hasHighImposter) {
    badgeImposter.classList.remove('locked');
    badgeImposter.classList.add('unlocked');
    unlockedCount++;
  } else {
    badgeImposter.classList.add('locked');
    badgeImposter.classList.remove('unlocked');
  }

  return unlockedCount;
}

// -------------------------------------------------------------
// VI. AURA COMPANION CHATBOT LOGIC
// -------------------------------------------------------------
function getAuraResponse(userMsg, lastAnalysis = null) {
  const msg = userMsg.toLowerCase();
  
  // Crisis keyword catch
  if (CONFIG.KEYWORDS.distress.some(w => msg.includes(w))) {
    showCrisisModal();
    return "Please listen to me, Sunirban. Your life and mental wellness are precious. I've popped up some free helplines. I strongly urge you to speak to them, or a trusted family member. We are in this together.";
  }

  // Breathing suggestion
  if (msg.includes('breath') || msg.includes('meditation') || msg.includes('relax')) {
    return `Let's practice box breathing together. Go to the "Breathing & Sound" tab. I can guide your rhythm: Inhale for 4 seconds, Hold for 4, Exhale for 4, and Hold empty. Ready when you are!`;
  }

  // Custom stage and exam responses
  const exam = STATE.settings.anonymize ? 'exam' : STATE.activeExam;
  const stage = STATE.prepStage;

  if (msg.includes('revision') || msg.includes('syllabus') || msg.includes('pressure')) {
    if (stage === 'Revision Phase' || stage === 'Last Stretch') {
      return `With your ${exam} exam coming up, revision pressure is at an peak. Try chunking your day: 45 minutes of studying, then a mandatory 15-minute screen-free break. You don't need to conquer the entire syllabus today, just focus on the current page.`;
    }
    return `Syllabus anxiety is real for ${exam}. Break your targets into micro-tasks. A task can be as small as 'Read 2 pages of notes' or 'Solve 5 physics problems.' Celebrate crossing these small tasks off!`;
  }

  if (msg.includes('mock') || msg.includes('marks') || msg.includes('score')) {
    return `Mock tests are diagnostics tools, NOT your final ${exam} rank. A low mock score is just data showing where the concept gaps are, not a reflection of your intelligence. Rest your eyes for 10 minutes, drink water, and review only the mistakes without self-judgment.`;
  }

  if (msg.includes('behind') || msg.includes('fail') || msg.includes('better')) {
    return `Exam prep often triggers comparison anxiety. Remember, everyone displays their best moments and hides their struggles. You are running your own race. Your worth is not tethered to a percentile index. Focus on improving by just 1% today.`;
  }

  // Default Empathetic fallbacks based on recent analysis
  if (lastAnalysis) {
    if (lastAnalysis.burnout >= 65) {
      return `I hear a lot of strain in your words. Your burnout risk is at ${lastAnalysis.burnout}%. Standard study habits say 'push harder,' but I recommend the opposite: take a full 3-hour study pause. Let your brain reset.`;
    }
    if (lastAnalysis.scores.fatigue >= 70) {
      return `It feels like physical exhaustion is taking over. Sleep and cognitive retention are deeply linked. Let's make a deal: log off, close your study table, and go to bed early tonight. Your prep will actually benefit from a rested brain.`;
    }
  }

  // Generic empathetic answers
  return `Thank you for sharing that with me. Remember that preparing for ${exam} is a marathon, not a sprint. How has your sleep cycle been? Sharing your daily routine can help me analyze stress levels better.`;
}

// -------------------------------------------------------------
// VII. UI UTILITIES & RENDERERS
// -------------------------------------------------------------

// Dynamic SVG Charting
function drawWeeklyTrendChart() {
  const chartPoints = document.getElementById('svg-chart-points');
  const chartLine = document.getElementById('svg-chart-line');
  const placeholderText = document.getElementById('svg-chart-placeholder-text');

  if (STATE.logs.length === 0) {
    chartPoints.innerHTML = '';
    chartLine.setAttribute('d', '');
    chartLine.classList.add('hidden');
    placeholderText.classList.remove('hidden');
    return;
  }

  placeholderText.classList.add('hidden');
  chartLine.classList.remove('hidden');

  // Grab last 7 logs, sort ascending
  const recentLogs = [...STATE.logs]
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  const paddingX = 50;
  const paddingY = 20;
  const chartWidth = 500 - paddingX * 2;
  const chartHeight = 200 - paddingY * 2;

  // Map to points
  const points = recentLogs.map((log, index) => {
    // x value scales over length
    const x = paddingX + (index * (chartWidth / Math.max(1, recentLogs.length - 1)));
    // y value scales with burnout risk (0% = bottom (170px), 100% = top (20px))
    const y = 170 - (log.burnout / 100) * chartHeight;
    return { x, y, burnout: log.burnout, mood: log.mood, date: log.date };
  });

  // Build SVG Path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for(let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }
  chartLine.setAttribute('d', pathD);

  // Build point markers
  let pointsHTML = '';
  points.forEach(pt => {
    const cleanDate = new Date(pt.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
    pointsHTML += `
      <g class="chart-point-group">
        <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="var(--color-primary)" stroke="#fff" stroke-width="2"></circle>
        <text x="${pt.x}" y="${pt.y - 12}" font-size="9" fill="var(--text-main)" font-weight="700" text-anchor="middle">${pt.burnout}%</text>
        <text x="${pt.x}" y="185" font-size="8" fill="var(--text-muted)" text-anchor="middle">${cleanDate}</text>
      </g>
    `;
  });
  chartPoints.innerHTML = pointsHTML;
}

// Dynamic counter helpers
function animateNumberValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / Math.max(1, range)));
  
  obj.classList.add('count-up-glowing');
  
  if (range === 0) {
    obj.textContent = `${end}%`;
    obj.classList.remove('count-up-glowing');
    return;
  }

  const timer = setInterval(() => {
    current += increment;
    obj.textContent = `${current}%`;
    
    if (current === end) {
      clearInterval(timer);
      obj.classList.remove('count-up-glowing');
    }
  }, stepTime);
}

function animateProgressBar(fillId, targetWidth, duration) {
  const el = document.getElementById(fillId);
  if (!el) return;
  el.style.width = '0%';
  setTimeout(() => {
    el.style.transition = `width ${duration}ms cubic-bezier(0.1, 0.8, 0.2, 1)`;
    el.style.width = `${targetWidth}%`;
  }, 20);
}

// Update the Burnout circular UI gauge
function updateBurnoutGauge(burnoutScore) {
  const fill = document.getElementById('stress-gauge-fill');
  const scoreVal = document.getElementById('burnout-percentage-val');
  const title = document.getElementById('stress-status-title');
  const desc = document.getElementById('stress-status-desc');

  // Smooth number count up
  animateNumberValue('burnout-percentage-val', 0, burnoutScore, 800);

  // Calculate SVG circular stroke offset
  const circumference = 263.89; // 2 * PI * 42
  const offset = circumference - (burnoutScore / 100) * circumference;
  
  // Animate the stroke offset smoothly
  fill.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)';
  fill.style.strokeDashoffset = offset;

  // Style colors based on score
  if (burnoutScore >= 75) {
    fill.style.stroke = 'var(--color-danger)';
    title.textContent = 'Status: Burnout Signal';
    title.className = 'text-accent-rose mt-10';
    desc.textContent = 'High indicators of imposter syndrome and sleep deficit. Pause studying. Read Aura suggestions.';
  } else if (burnoutScore >= 45) {
    fill.style.stroke = 'var(--color-warning)';
    title.textContent = 'Status: Elevated Stress';
    title.className = 'text-accent-amber mt-10';
    desc.textContent = 'Moderate fatigue detected. Practice a 4-4 box breathing sequence to downregulate your heart rate.';
  } else {
    fill.style.stroke = 'var(--color-calm)';
    title.textContent = 'Status: Balanced Flow';
    title.className = 'text-accent-sage mt-10';
    desc.textContent = 'Your emotional registers show balanced levels. Keep consistency high, but schedule rest intervals.';
  }
}

// Display recommendations on UI
function populateRecommendations(scores, aggregateBurnout) {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = '';

  let recList = [];

  if (scores.fatigue >= 60) {
    recList.push({
      icon: 'fa-bed',
      text: 'Physical Fatigue detected. Rest your eyes for 15 mins every 90 study mins. Avoid caffeine post-5 PM.'
    });
  }
  if (scores.imposter >= 60) {
    recList.push({
      icon: 'fa-shield-heart',
      text: 'Imposter Syndrome flag. Review "Self-Doubt Support" in Aura Chat. You are not a score.'
    });
  }
  if (scores.anxiety >= 50) {
    recList.push({
      icon: 'fa-wind',
      text: 'Test Anxiety. Start a 5-minute Box Breathing relaxation session to ground nervous flutters.'
    });
  }
  if (scores.pressure >= 60) {
    recList.push({
      icon: 'fa-people-group',
      text: 'External expectations detected. Study isolation reset: Talk to one non-prep friend today.'
    });
  }

  // Fallback if low stress
  if (recList.length === 0) {
    recList.push({
      icon: 'fa-face-smile-beam',
      text: 'Keep doing what you are doing! Ensure your workspace has proper lighting and air circulation.'
    });
  }

  const listEl = document.createElement('div');
  listEl.className = 'recommendations-list';

  recList.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'rec-item';
    item.innerHTML = `
      <i class="fa-solid ${rec.icon}"></i>
      <span>${rec.text}</span>
      <button class="rec-speak-btn" title="Speak advice out loud"><i class="fa-solid fa-volume-high"></i></button>
    `;
    
    // Add text-to-speech button listener
    item.querySelector('.rec-speak-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      speakOutLoud(rec.text);
    });

    listEl.appendChild(item);
  });

  container.appendChild(listEl);
}

// Update History Logs List
function renderJournalHistory() {
  const container = document.getElementById('journal-history-list');
  container.innerHTML = '';

  if (STATE.logs.length === 0) {
    container.innerHTML = `
      <div class="empty-list-state">
        <p class="text-small text-center"><i class="fa-regular fa-folder-open"></i> No logged journals yet.</p>
      </div>
    `;
    return;
  }

  // Sort logs by date descending (latest first)
  const sorted = [...STATE.logs].sort((a,b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(log => {
    const dateStr = new Date(log.date).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const item = document.createElement('div');
    item.className = 'history-item';

    // Badge styling
    let scoreColor = 'bg-sage';
    if (log.burnout >= 75) scoreColor = 'bg-coral';
    else if (log.burnout >= 45) scoreColor = 'bg-amber';

    item.innerHTML = `
      <div class="history-item-header">
        <strong>${log.mood.toUpperCase()}</strong>
        <span>${dateStr}</span>
      </div>
      <div class="history-item-text" title="${escapeHtml(log.text)}">${escapeHtml(log.text || '(No journal text)')}</div>
      <span class="history-item-score-badge ${scoreColor}">${log.burnout}% Burnout Risk</span>
    `;
    
    container.appendChild(item);
  });
}

// Escape helper to prevent cross-site scripting
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Toast Notifications helper
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'fa-info-circle text-accent-indigo';
  if (type === 'success') icon = 'fa-check-circle text-accent-sage';
  else if (type === 'warning') icon = 'fa-exclamation-triangle text-accent-amber';
  else if (type === 'danger') icon = 'fa-times-circle text-accent-rose';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// -------------------------------------------------------------
// VIII. GUIDED BOX BREATHING TIMERS
// -------------------------------------------------------------
let breathInterval = null;
let breathingSessionActive = false;

function startBreathingSession() {
  const button = document.getElementById('btn-breathing-control');
  const sphere = document.getElementById('breath-sphere');
  const ring = document.getElementById('breath-ring-outer');
  const stateTxt = document.getElementById('breath-state-text');
  const timerTxt = document.getElementById('breath-timer');
  const isVoice = document.getElementById('breathing-voice-toggle').checked;
  const pace = document.querySelector('.breathing-type-selectors .active').dataset.pace;

  if (breathingSessionActive) {
    // STOP session
    clearInterval(breathInterval);
    breathInterval = null;
    breathingSessionActive = false;
    
    sphere.className = 'breath-sphere';
    ring.style.transform = 'scale(1)';
    stateTxt.textContent = 'Ready';
    timerTxt.textContent = '0';
    button.innerHTML = '<i class="fa-solid fa-play"></i> Start Breathing Session';
    showToast('Breathing session paused', 'info');
    return;
  }

  // START session
  breathingSessionActive = true;
  button.innerHTML = '<i class="fa-solid fa-square"></i> Stop Session';
  showToast('Starting breathing cycle. Follow the instructions.', 'success');

  // Set local storage flag for badge unlocks
  localStorage.setItem('mindzen_breath_done', 'true');
  checkAndUnlockBadges();

  let phase = 0; // 0 = Inhale, 1 = Hold, 2 = Exhale, 3 = Hold empty
  let secondsLeft = 4;

  // Set phase timing details based on selector
  // Box breathing (4-4-4-4), Relaxation (4-7-8), Equal (4-4-0-0)
  const getPhaseConfig = (ph) => {
    if (pace === 'box') {
      return { dur: 4, label: ['Inhale', 'Hold', 'Exhale', 'Hold Empty'][ph], scale: [2, 2, 1, 1][ph], cl: ['breath-inhale', 'breath-inhale breath-hold', 'breath-exhale', 'breath-exhale'][ph] };
    } else if (pace === 'relax') {
      const durs = [4, 7, 8, 0];
      return { dur: durs[ph], label: ['Inhale', 'Hold Breath', 'Slow Exhale', ''][ph], scale: [2.2, 2.2, 1, 1][ph], cl: ['breath-inhale', 'breath-inhale breath-hold', 'breath-exhale', 'breath-exhale'][ph] };
    } else { // equal
      const durs = [4, 0, 4, 0];
      return { dur: durs[ph], label: ['Inhale', '', 'Exhale', ''][ph], scale: [2, 1, 1, 1][ph], cl: ['breath-inhale', '', 'breath-exhale', ''][ph] };
    }
  };

  const executeCycle = () => {
    const config = getPhaseConfig(phase);
    
    // Skip phases with 0 duration (like Holds in Equal Breathing)
    if (config.dur === 0) {
      phase = (phase + 1) % 4;
      executeCycle();
      return;
    }

    secondsLeft = config.dur;
    stateTxt.textContent = config.label;
    timerTxt.textContent = secondsLeft;
    
    sphere.className = `breath-sphere ${config.cl}`;
    ring.style.transform = `scale(${config.scale})`;
    
    if (isVoice) {
      speakOutLoud(config.label);
    }
  };

  executeCycle();

  breathInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      phase = (phase + 1) % 4;
      executeCycle();
    } else {
      timerTxt.textContent = secondsLeft;
    }
  }, 1000);
}

// -------------------------------------------------------------
// IX. DATA LAYER & LOCAL STORAGE SYNC
// -------------------------------------------------------------
function saveAppState() {
  const data = {
    streak: STATE.streak,
    logs: STATE.logs,
    activeExam: STATE.activeExam,
    prepStage: STATE.prepStage,
    settings: STATE.settings
  };
  
  // Anonymization cleanup
  if (STATE.settings.anonymize) {
    localStorage.setItem('mindzen_user', 'Anonymous Scholar');
  } else {
    localStorage.setItem('mindzen_user', STATE.currentUser);
  }

  localStorage.setItem('mindzen_app_state', JSON.stringify(data));
}

function loadAppState() {
  const savedUser = localStorage.getItem('mindzen_user');
  const savedState = localStorage.getItem('mindzen_app_state');

  if (savedUser && savedState) {
    STATE.isLoggedIn = true;
    STATE.currentUser = savedUser;
    
    try {
      const parsed = JSON.parse(savedState);
      STATE.streak = parsed.streak || 0;
      STATE.logs = parsed.logs || [];
      STATE.activeExam = parsed.activeExam || 'UPSC';
      STATE.prepStage = parsed.prepStage || 'Mid Prep';
      STATE.settings = { ...STATE.settings, ...parsed.settings };
    } catch(e) {
      console.error("Corrupted state, resetting options.", e);
    }
    
    return true;
  }
  return false;
}

function purgeAllStorageMemory() {
  localStorage.removeItem('mindzen_user');
  localStorage.removeItem('mindzen_app_state');
  localStorage.removeItem('mindzen_breath_done');
  
  // reset local state variables
  STATE.streak = 0;
  STATE.logs = [];
  STATE.activeExam = 'UPSC';
  STATE.prepStage = 'Mid Prep';
  STATE.settings = {
    anonymize: false,
    ttsEnabled: true,
    ttsSpeed: 1.0,
    fontSize: 16,
    highContrast: false
  };

  showToast('All diagnostic storage data purged successfully.', 'warning');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// -------------------------------------------------------------
// X. ACCESSIBILITY STYLING MODIFIERS
// -------------------------------------------------------------
function applyAccessibilitySettings() {
  // Theme contrast
  if (STATE.settings.highContrast) {
    document.body.classList.add('high-contrast');
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.remove('high-contrast');
  }

  // Text Scaling
  document.documentElement.style.fontSize = `${STATE.settings.fontSize}px`;
  document.getElementById('font-scale-val').textContent = `${STATE.settings.fontSize}px`;
  document.getElementById('setting-font-scaler').value = STATE.settings.fontSize;

  // Mask sensitive labels if anonymize active
  const nameEl = document.getElementById('user-display-name');
  if (STATE.settings.anonymize) {
    nameEl.textContent = 'Anonymous Scholar';
    document.getElementById('page-title').textContent = 'Peaceful Day, Scholar';
  } else {
    nameEl.textContent = STATE.currentUser;
    document.getElementById('page-title').textContent = `Peaceful Day, ${STATE.currentUser}`;
  }

  // Update exam configurations in side navigation
  document.getElementById('user-exam-badge').textContent = `${STATE.activeExam} - ${STATE.prepStage}`;
}

// Crisis Modal handles
function showCrisisModal() {
  const modal = document.getElementById('crisis-modal');
  modal.classList.remove('hidden');
}
function hideCrisisModal() {
  const modal = document.getElementById('crisis-modal');
  modal.classList.add('hidden');
}

// -------------------------------------------------------------
// XI. EVENT ROUTERS & INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Check if session exists
  const hasSession = loadAppState();
  if (hasSession) {
    initializeWorkspace();
  }

  // 1. LOGIN SUBMIT
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value;

    if (userIn === CONFIG.MOCK_USER && passIn === CONFIG.MOCK_PASS) {
      STATE.isLoggedIn = true;
      STATE.currentUser = userIn;
      initializeWorkspace();
      showToast('Welcome to MindZen. Your stress-free sanctuary is active.', 'success');
    } else {
      showToast('Authentication failed. Invalid mock credentials.', 'danger');
    }
  });

  // Toggle login password view
  document.getElementById('toggle-password-visibility').addEventListener('click', () => {
    const pass = document.getElementById('password');
    const icon = document.querySelector('#toggle-password-visibility i');
    if (pass.type === 'password') {
      pass.type = 'text';
      icon.className = 'fa-regular fa-eye-slash';
    } else {
      pass.type = 'password';
      icon.className = 'fa-regular fa-eye';
    }
  });

  // 2. NAVIGATION HANDLERS
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetView = btn.dataset.target;
      
      // Update sidebar nav states
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle views
      const panels = document.querySelectorAll('.view-panel');
      panels.forEach(p => p.classList.remove('active'));
      
      const targetPanel = document.getElementById(targetView);
      targetPanel.classList.add('active');

      // View-specific trigger updates
      if (targetView === 'view-analytics') {
        drawWeeklyTrendChart();
        renderJournalHistory();
      }
    });
  });

  // 3. MOOD INPUT SELECTION
  const moodBtns = document.querySelectorAll('.mood-btn');
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 4. JOURNAL WORD COUNTER
  const journalInput = document.getElementById('journal-input');
  journalInput.addEventListener('input', () => {
    const text = journalInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    document.getElementById('journal-word-count').textContent = `${words} words`;
  });

  // Clear Journal
  document.getElementById('clear-journal-btn').addEventListener('click', () => {
    journalInput.value = '';
    document.getElementById('journal-word-count').textContent = '0 words';
  });

  // Analyze Journal Click
  document.getElementById('analyze-journal-btn').addEventListener('click', () => {
    const text = journalInput.value.trim();
    const activeMoodBtn = document.querySelector('.mood-emojis-container .active');
    
    if (!text && !activeMoodBtn) {
      showToast('Please select a mood or write in the journal before analyzing.', 'warning');
      return;
    }

    const currentMood = activeMoodBtn ? activeMoodBtn.dataset.mood : 'calm';
    
    // Perform text metrics analysis
    const analysis = analyzeTextLogs(text, currentMood);

    // Crisis Warning trigger
    if (analysis.isCrisis) {
      showCrisisModal();
    }

    // Save record to state logs
    const newLog = {
      date: new Date().toISOString(),
      mood: currentMood,
      text: text,
      scores: analysis.scores,
      burnout: analysis.burnout,
      exam: STATE.activeExam,
      stage: STATE.prepStage
    };

    STATE.logs.push(newLog);
    updateStreakCount();
    checkAndUnlockBadges();
    saveAppState();

    // UI Updates
    updateBurnoutGauge(analysis.burnout);
    
    // Render Bars
    document.getElementById('val-fatigue').textContent = `${analysis.scores.fatigue}%`;
    document.getElementById('fill-fatigue').style.width = `${analysis.scores.fatigue}%`;

    document.getElementById('val-imposter').textContent = `${analysis.scores.imposter}%`;
    document.getElementById('fill-imposter').style.width = `${analysis.scores.imposter}%`;

    document.getElementById('val-anxiety').textContent = `${analysis.scores.anxiety}%`;
    document.getElementById('fill-anxiety').style.width = `${analysis.scores.anxiety}%`;

    document.getElementById('val-pressure').textContent = `${analysis.scores.pressure}%`;
    document.getElementById('fill-pressure').style.width = `${analysis.scores.pressure}%`;

    // Populate dynamic advisor recommendations
    populateRecommendations(analysis.scores, analysis.burnout);

    // Update global dashboard statistics
    document.getElementById('streak-count-val').textContent = `${STATE.streak} days`;
    
    // Add context to Chat Aura
    const chatbotBubble = getAuraResponse(`Analyzed logs: ${text}`, analysis);
    addChatBubble(chatbotBubble, 'aura');

    showToast('Your diagnostic wellness logs were processed successfully.', 'success');
  });

  // 5. CHAT INTERACTIONS
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatInput = document.getElementById('chat-input-field');

  function triggerSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatBubble(text, 'user');
    chatInput.value = '';

    // Simulate Aura typing delay
    setTimeout(() => {
      const response = getAuraResponse(text);
      addChatBubble(response, 'aura');
      
      // Auto narration if enabled
      if (STATE.settings.ttsEnabled) {
        speakOutLoud(response);
      }
    }, 600);
  }

  chatSendBtn.addEventListener('click', triggerSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSendMessage();
  });

  // Chip clicks
  const chips = document.querySelectorAll('.chat-suggestion-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.prompt;
      addChatBubble(text, 'user');
      setTimeout(() => {
        const response = getAuraResponse(text);
        addChatBubble(response, 'aura');
        if (STATE.settings.ttsEnabled) speakOutLoud(response);
      }, 500);
    });
  });

  function addChatBubble(text, sender) {
    const area = document.getElementById('chat-messages-area');
    const bubble = document.createElement('div');
    bubble.className = `message ${sender === 'user' ? 'user-msg' : 'aura-msg'}`;

    const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    
    bubble.innerHTML = `
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <span class="msg-time">${time}</span>
    `;
    area.appendChild(bubble);
    area.scrollTop = area.scrollHeight;
  }

  // 6. MINDFUL BREATHING CONTROLS
  document.getElementById('btn-breathing-control').addEventListener('click', startBreathingSession);

  // Breathing style selection
  const breathingToggles = document.querySelectorAll('.breathing-type-selectors .btn-toggle');
  breathingToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      // If session is active, stop it first
      if (breathingSessionActive) {
        startBreathingSession(); // stops
      }
      breathingToggles.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 7. AMBIENT SOUNDSCAPE SYNTH CONTROLS
  const synthVolume = document.getElementById('synth-volume');
  synthVolume.addEventListener('input', () => {
    const val = parseFloat(synthVolume.value);
    document.getElementById('volume-val-display').textContent = `${Math.round(val * 100)}%`;
    AudioSynth.setMasterVolume(val);
  });

  document.getElementById('rain-intensity').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    AudioSynth.setRainFilterFreq(val);
  });

  // Audio Play Buttons
  const playSynthBtns = document.querySelectorAll('.btn-play-synth');
  playSynthBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.synth;
      const card = btn.closest('.track-card');
      
      let isPlaying = false;
      if (type === 'binaural') {
        isPlaying = AudioSynth.toggleBinaural();
      } else if (type === 'rain') {
        isPlaying = AudioSynth.toggleRain();
      } else if (type === 'brown') {
        isPlaying = AudioSynth.toggleBrownNoise();
      }

      if (isPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        btn.classList.add('active');
        card.classList.add('playing');
        showToast(`Playing dynamic ${type} soundscape`, 'success');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.classList.remove('active');
        card.classList.remove('playing');
      }
    });
  });

  // 8. 5-4-3-2-1 GROUNDING wizard steps
  const groundingBtns = document.querySelectorAll('.btn-next-step');
  groundingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStepNum = btn.dataset.next;
      const currentStep = btn.closest('.grounding-step');
      
      currentStep.classList.remove('active');
      document.getElementById(`grounding-step-${nextStepNum}`).classList.add('active');
      
      if (STATE.settings.ttsEnabled) {
        const nextTitle = document.querySelector(`#grounding-step-${nextStepNum} h4`).textContent;
        const nextDesc = document.querySelector(`#grounding-step-${nextStepNum} p`).textContent;
        speakOutLoud(`${nextTitle}. ${nextDesc}`);
      }
    });
  });

  document.getElementById('btn-finish-grounding').addEventListener('click', () => {
    document.getElementById('grounding-step-5').classList.remove('active');
    document.getElementById('grounding-step-1').classList.add('active');
    showToast('Excellent. Your focus reset grounding session is complete.', 'success');
  });

  // 9. SETTINGS PREFERENCE HANDLERS
  const checkAnonymize = document.getElementById('setting-anonymize');
  checkAnonymize.addEventListener('change', () => {
    STATE.settings.anonymize = checkAnonymize.checked;
    saveAppState();
    applyAccessibilitySettings();
    showToast('Data Masking preferences updated.', 'info');
  });

  const checkHighContrast = document.getElementById('setting-high-contrast');
  checkHighContrast.addEventListener('change', () => {
    STATE.settings.highContrast = checkHighContrast.checked;
    if (STATE.settings.highContrast) {
      STATE.settings.theme = 'high-contrast';
    } else {
      STATE.settings.theme = 'dark';
    }
    saveAppState();
    applyAccessibilitySettings();
  });

  const fontScaler = document.getElementById('setting-font-scaler');
  fontScaler.addEventListener('input', () => {
    const scale = parseInt(fontScaler.value);
    STATE.settings.fontSize = scale;
    saveAppState();
    applyAccessibilitySettings();
  });

  const checkTTS = document.getElementById('setting-tts-enabled');
  checkTTS.addEventListener('change', () => {
    STATE.settings.ttsEnabled = checkTTS.checked;
    saveAppState();
  });

  const ttsSpeed = document.getElementById('setting-tts-speed');
  ttsSpeed.addEventListener('input', () => {
    const speed = parseFloat(ttsSpeed.value);
    STATE.settings.ttsSpeed = speed;
    document.getElementById('tts-speed-val').textContent = `${speed.toFixed(1)}x`;
    saveAppState();
  });

  // Purge/Delete Data Action
  document.getElementById('btn-purge-storage').addEventListener('click', () => {
    if (confirm('Warning! This will erase all journals, streak statistics, and personal settings permanently.')) {
      purgeAllStorageMemory();
    }
  });

  document.getElementById('btn-clear-history-all').addEventListener('click', () => {
    if (confirm('Clear all journal records? Streak statistics will be preserved.')) {
      STATE.logs = [];
      saveAppState();
      renderJournalHistory();
      drawWeeklyTrendChart();
      showToast('Journal history purged', 'info');
    }
  });

  // 10. EXAM CONTEXT MODES
  document.getElementById('exam-type').addEventListener('change', (e) => {
    STATE.activeExam = e.target.value;
    saveAppState();
    applyAccessibilitySettings();
  });
  document.getElementById('prep-stage').addEventListener('change', (e) => {
    STATE.prepStage = e.target.value;
    saveAppState();
    applyAccessibilitySettings();
  });

  // 11. CRISIS POPUP HANDLERS
  document.getElementById('quick-crisis-btn').addEventListener('click', showCrisisModal);
  document.getElementById('close-crisis-modal').addEventListener('click', hideCrisisModal);
  document.getElementById('crisis-ok-btn').addEventListener('click', hideCrisisModal);

  // 12. LOGOUT ACTIONS
  document.getElementById('logout-btn').addEventListener('click', () => {
    AudioSynth.stopAll();
    STATE.isLoggedIn = false;
    document.getElementById('main-workspace').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    showToast('Logged out of workspace session.', 'info');
  });
});

// Workspace launcher
function initializeWorkspace() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-workspace').classList.remove('hidden');

  // Load selections onto select boxes
  document.getElementById('exam-type').value = STATE.activeExam;
  document.getElementById('prep-stage').value = STATE.prepStage;

  // Toggle checks on preference panel
  document.getElementById('setting-anonymize').checked = STATE.settings.anonymize;
  document.getElementById('setting-high-contrast').checked = STATE.settings.highContrast;
  document.getElementById('setting-tts-enabled').checked = STATE.settings.ttsEnabled;
  document.getElementById('setting-tts-speed').value = STATE.settings.ttsSpeed;
  document.getElementById('tts-speed-val').textContent = `${STATE.settings.ttsSpeed.toFixed(1)}x`;

  // Apply visual styling overlays
  applyAccessibilitySettings();

  // Load statistics details
  document.getElementById('streak-count-val').textContent = `${STATE.streak} days`;
  
  // Refresh badges & history
  updateStreakCount();
  checkAndUnlockBadges();

  // Top statistics
  updateDashboardGlobalStats();
}

function updateDashboardGlobalStats() {
  const total = STATE.logs.length;
  document.getElementById('stat-total-entries').textContent = total;

  if (total > 0) {
    const avgBurnout = Math.round(STATE.logs.reduce((acc, log) => acc + log.burnout, 0) / total);
    document.getElementById('stat-avg-burnout').textContent = `${avgBurnout}%`;

    // Calculate dominant mood
    const moods = STATE.logs.map(l => l.mood);
    const mode = moods.sort((a,b) =>
          moods.filter(v => v===a).length - moods.filter(v => v===b).length
    ).pop();
    
    // Map emoji key to beautiful word
    const moodLabels = { calm: 'Calm🧘', excited: 'Focused⚡', tired: 'Exhausted🥱', stressed: 'Stressed😟', anxious: 'Anxious😰', burntout: 'Overwhelmed🥀' };
    document.getElementById('stat-dominant-mood').textContent = moodLabels[mode] || 'Balanced';
  } else {
    document.getElementById('stat-avg-burnout').textContent = '0%';
    document.getElementById('stat-dominant-mood').textContent = 'None';
  }
}

// Hook state log savings back to global metrics
const originSaveAppState = saveAppState;
saveAppState = function() {
  originSaveAppState();
  updateDashboardGlobalStats();
};
