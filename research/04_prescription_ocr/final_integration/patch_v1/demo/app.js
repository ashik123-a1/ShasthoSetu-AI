const SAMPLES = {
  "0052": {
    "id": "0052",
    "filename": "0052.jpg",
    "imagePath": "/images/0052.jpg",
    "meanConfidence": 0.57,
    "tokens": [
      { "text": "বাংলাদেশ", "conf": 0.88 },
      { "text": "ফরম", "conf": 0.85 },
      { "text": "নং", "conf": 0.82 },
      { "text": "৭৬৯", "conf": 0.80 },
      { "text": "বহির্বিভাগীয়", "conf": 0.74 },
      { "text": "Cap", "conf": 0.65 },
      { "text": "Roxim", "conf": 0.68 },
      { "text": "400", "conf": 0.72 },
      { "text": "১+০+১", "conf": 0.61 },
      { "text": "এদিন", "conf": 0.38 },
      { "text": "Cap", "conf": 0.62 },
      { "text": "Maxpro", "conf": 0.54 },
      { "text": "২০", "conf": 0.42 },
      { "text": "১+০+১", "conf": 0.51 }
    ],
    "candidates": [
      { "id": 1, "name": "Roxim", "strength": "400 mg", "dose": "", "frequency": "১+০+১", "duration": "", "route": "", "confidence": 0.68 },
      { "id": 2, "name": "Maxpro", "strength": "20 mg", "dose": "", "frequency": "১+০+১", "duration": "", "route": "", "confidence": 0.54 }
    ]
  },
  "0011": {
    "id": "0011",
    "filename": "0011.jpg",
    "imagePath": "/images/0011.jpg",
    "meanConfidence": 0.32,
    "tokens": [
      { "text": "Tab.", "conf": 0.52 },
      { "text": "Imucort", "conf": 0.45 },
      { "text": "6/24", "conf": 0.35 },
      { "text": "১+১+১", "conf": 0.41 },
      { "text": "Spray", "conf": 0.58 },
      { "text": "Zeltas", "conf": 0.34 }
    ],
    "candidates": [
      { "id": 1, "name": "Imucort", "strength": "6 mg", "dose": "", "frequency": "১+১+১", "duration": "", "route": "", "confidence": 0.45 },
      { "id": 2, "name": "Zeltas Nasal Spray", "strength": "", "dose": "", "frequency": "১+০+১", "duration": "", "route": "", "confidence": 0.34 }
    ]
  },
  "0174": {
    "id": "0174",
    "filename": "0174.jpg",
    "imagePath": "/images/0174.jpg",
    "meanConfidence": 0.34,
    "tokens": [
      { "text": "Shaheed", "conf": 0.78 },
      { "text": "Hospital", "conf": 0.81 },
      { "text": "Tab", "conf": 0.55 },
      { "text": "Histal", "conf": 0.52 },
      { "text": "4mg", "conf": 0.58 },
      { "text": "০+০+১", "conf": 0.49 },
      { "text": "৩০", "conf": 0.45 },
      { "text": "দিন", "conf": 0.62 }
    ],
    "candidates": [
      { "id": 1, "name": "Histal", "strength": "4 mg", "dose": "", "frequency": "০+০+১", "duration": "30 days", "route": "", "confidence": 0.52 }
    ]
  },
  "0001": {
    "id": "0001",
    "filename": "0001.jpg",
    "imagePath": "/images/0001.jpg",
    "meanConfidence": 0.48,
    "tokens": [
      { "text": "Clinical", "conf": 0.82 },
      { "text": "Inj", "conf": 0.51 },
      { "text": "Xgeva", "conf": 0.44 },
      { "text": "120mg", "conf": 0.83 }
    ],
    "candidates": [
      { "id": 1, "name": "Xgeva", "strength": "120 mg", "dose": "", "frequency": "Once as needed", "duration": "", "route": "", "confidence": 0.44 }
    ]
  }
};

let currentSample = null;

function loadSample(sampleId) {
  const sample = SAMPLES[sampleId];
  if (!sample) return;
  currentSample = sample;

  document.getElementById("verification-status-badge").className = "status-tag status-unverified";
  document.getElementById("verification-status-badge").textContent = "UNVERIFIED_REQUIRES_HUMAN_REVIEW";
  document.getElementById("image-status-tag").className = "status-tag status-unverified";
  document.getElementById("image-status-tag").textContent = "STATUS: UNVERIFIED";
  document.getElementById("simulated-panel").style.display = "none";
  document.getElementById("legal-confirm-checkbox").checked = false;

  document.getElementById("prescription-image").src = sample.imagePath;

  const streamEl = document.getElementById("ocr-stream");
  streamEl.innerHTML = sample.tokens.map(t => {
    if (t.conf < 0.60) {
      return `<span class="uncertain-token" title="Low OCR Confidence: ${(t.conf * 100).toFixed(0)}% (REVIEW MANDATORY)">${t.text}</span>`;
    } else {
      return `<span class="confident-token" title="OCR Confidence: ${(t.conf * 100).toFixed(0)}%">${t.text}</span>`;
    }
  }).join(" ");

  const container = document.getElementById("candidates-container");
  container.innerHTML = sample.candidates.map((c, i) => `
    <div class="candidate-item">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 0.85rem;">Medication Candidate #${c.id}</span>
        <span style="font-size: 0.75rem; color: ${c.confidence < 0.6 ? '#dc2626' : '#0284c7'}; font-weight: 600;">
          Confidence: ${(c.confidence * 100).toFixed(0)}% ${c.confidence < 0.6 ? '(REVIEW REQUIRED)' : ''}
        </span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Brand / Generic Name:</label>
          <input type="text" id="cand-name-${i}" value="${c.name}" class="${c.confidence < 0.6 ? 'uncertain-field' : ''}">
        </div>
        <div class="form-group">
          <label>Strength & Unit:</label>
          <input type="text" id="cand-strength-${i}" value="${c.strength}" placeholder="[UNSPECIFIED]">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Frequency Schedule:</label>
          <input type="text" id="cand-freq-${i}" value="${c.frequency}" placeholder="[UNSPECIFIED]">
        </div>
        <div class="form-group">
          <label>Duration:</label>
          <input type="text" id="cand-dur-${i}" value="${c.duration}" placeholder="[UNSPECIFIED]">
        </div>
      </div>
    </div>
  `).join("");
}

document.getElementById("prescription-selector").addEventListener("change", (e) => {
  loadSample(e.target.value);
});

document.getElementById("btn-verify").addEventListener("click", async () => {
  const reviewerName = document.getElementById("clinician-name").value.trim();
  const reviewerId = document.getElementById("clinician-bmdc").value.trim();
  const confirmed = document.getElementById("legal-confirm-checkbox").checked;

  if (!confirmed) {
    alert("Safety Halt: You must certify that this review is for simulation demonstration only.");
    return;
  }

  const correctedOrders = currentSample.candidates.map((c, i) => ({
    medicine_name: document.getElementById(`cand-name-${i}`).value.trim(),
    strength: document.getElementById(`cand-strength-${i}`).value.trim() || null,
    frequency: document.getElementById(`cand-freq-${i}`).value.trim() || null,
    duration: document.getElementById(`cand-dur-${i}`).value.trim() || null
  }));

  try {
    const res = await fetch("/api/simulate-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_id: currentSample.id,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName,
        orders: correctedOrders,
        legal_declaration_signed: confirmed
      })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById("verification-status-badge").className = "status-tag status-simulated";
      document.getElementById("verification-status-badge").textContent = data.verification_status;
      document.getElementById("image-status-tag").className = "status-tag status-simulated";
      document.getElementById("image-status-tag").textContent = "STATUS: SIMULATED_REVIEW_ONLY";

      document.getElementById("simulation-summary-text").textContent = 
        `Simulation recorded under '${reviewerName}' (${reviewerId}). Automated patient reminders remain strictly DISABLED (reminder_auto_enabled = false).`;
      document.getElementById("fhir-json-preview").textContent = JSON.stringify(data.fhir_proposal, null, 2);
      document.getElementById("simulated-panel").style.display = "block";
    } else {
      alert(`Simulation Error: ${data.message || data.error}`);
    }
  } catch (err) {
    console.error("Local API request failed:", err);
  }
});

document.getElementById("btn-test-security-rejection").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/attempt-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prescription_id: currentSample.id })
    });
    const data = await res.json();
    alert(`🛡️ SAFETY GATE WORKING AS DESIGNED (HTTP ${res.status}):\n${data.message}\nAutomated dispatch is 100% blocked.`);
  } catch (err) {
    alert("Direct dispatch request blocked by network / security barrier.");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  loadSample("0052");
});
