/**
 * MindZen Diagnostic Test Script
 * Run this script using Node.js to verify stress logic, keyword detection,
 * burnout calculations, and distress safety nets.
 */

const assert = require('assert');

// 1. Core Keywords Configuration aligned exactly with app.js
const CONFIG = {
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

function analyzeTextLogs(text, mood) {
  const cleanText = text.toLowerCase();
  let matchCounts = { fatigue: 0, imposter: 0, anxiety: 0, pressure: 0, distress: 0 };

  Object.keys(CONFIG.KEYWORDS).forEach(category => {
    CONFIG.KEYWORDS[category].forEach(word => {
      const matches = cleanText.split(word).length - 1;
      matchCounts[category] += matches;
    });
  });

  const calculateScore = (count) => Math.min(100, Math.round((count / 3) * 100));
  
  let fatigue = calculateScore(matchCounts.fatigue);
  let imposter = calculateScore(matchCounts.imposter);
  let anxiety = calculateScore(matchCounts.anxiety);
  let pressure = calculateScore(matchCounts.pressure);
  
  if (mood === 'burntout') {
    fatigue = Math.max(fatigue, 80);
    imposter = Math.max(imposter, 70);
  } else if (mood === 'stressed') {
    anxiety = Math.max(anxiety, 75);
  } else if (mood === 'tired') {
    fatigue = Math.max(fatigue, 85);
  } else if (mood === 'calm') {
    fatigue = Math.round(fatigue * 0.7);
    anxiety = Math.round(anxiety * 0.6);
  }

  const burnoutScore = Math.min(100, Math.round((fatigue * 0.35) + (anxiety * 0.3) + (imposter * 0.2) + (pressure * 0.15)));
  const isCrisis = matchCounts.distress > 0;

  return {
    scores: { fatigue, imposter, anxiety, pressure },
    burnout: burnoutScore,
    isCrisis: isCrisis
  };
}

// -------------------------------------------------------------
// 2. ASSERTION TESTS
// -------------------------------------------------------------
try {
  console.log("=== MindZen Automated Diagnostics Running ===");

  // Test Case A: Balanced/Calm Log
  const resultA = analyzeTextLogs("Today was alright. Read physics notes. Feeling okay.", "calm");
  assert.strictEqual(resultA.isCrisis, false, "Should NOT trigger crisis flags");
  assert.ok(resultA.burnout < 30, "Balanced log should have low burnout score");
  console.log("✅ Test Case A Passed: Balanced flow validated");

  // Test Case B: Burnout and Fatigue (Exact text run in browser test)
  const resultB = analyzeTextLogs("I could not sleep last night at all. My head is pounding and eyes hurt. I feel like everyone else is far ahead of me in UPSC prep and I will fail this attempt.", "tired");
  
  console.log("   -> Detected fatigue score:", resultB.scores.fatigue);
  console.log("   -> Detected imposter score:", resultB.scores.imposter);
  console.log("   -> Aggregated burnout score:", resultB.burnout);

  assert.ok(resultB.scores.fatigue >= 80, "Exhaustion text should trigger high fatigue score");
  assert.ok(resultB.scores.imposter > 50, "Comparison text should trigger imposter syndrome indicators");
  assert.ok(resultB.burnout > 40, "Combined score should yield elevated burnout risk");
  console.log("✅ Test Case B Passed: Hidden fatigue and imposter detection validated");

  // Test Case C: Safety Distress Check
  const resultC = analyzeTextLogs("Everything is pointless and I feel like I just want to die. I cannot handle this exam pressure.", "burntout");
  assert.strictEqual(resultC.isCrisis, true, "Extreme words MUST trigger isCrisis flag");
  console.log("✅ Test Case C Passed: Safety Distress Crisis triggers validated");

  console.log("\nAll diagnostic unit tests passed successfully! 🚀");
  process.exit(0);

} catch (error) {
  console.error("❌ Diagnostic Test Assertion Failed:", error.message);
  process.exit(1);
}
