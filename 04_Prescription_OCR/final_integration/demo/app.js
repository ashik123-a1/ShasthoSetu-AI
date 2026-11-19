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
      { "text": "রোগীর", "conf": 0.78 },
      { "text": "টিকিট", "conf": 0.75 },
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
      {
        "id": 1,
        "name": "Roxim",
        "strength": "400 mg",
        "dose": "",
        "frequency": "১+০+১",
        "duration": "",
        "route": "Oral",
        "confidence": 0.68
      },
      {
        "id": 2,
        "name": "Maxpro",
        "strength": "20 mg",
        "dose": "",
        "frequency": "১+০+১",
        "duration": "",
        "route": "Oral",
        "confidence": 0.54
      }
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
      { "text": "Cap", "conf": 0.48 },
      { "text": "Tab:", "conf": 0.38 },
      { "text": "Rabe", "conf": 0.42 },
      { "text": "১+০+১", "conf": 0.40 },
      { "text": "Spray", "conf": 0.58 },
      { "text": "Zeltas", "conf": 0.34 }
    ],
    "candidates": [
      {
        "id": 1,
        "name": "Imucort",
        "strength": "6 mg",
        "dose": "",
        "frequency": "১+১+১",
        "duration": "24 days",
        "route": "Oral",
        "confidence": 0.45
      },
      {
        "id": 2,
        "name": "Zeltas Nasal Spray",
        "strength": "",
        "dose": "1 spray",
        "frequency": "১+০+১",
        "duration": "2 months",
        "route": "Nasal",
        "confidence": 0.34
      }
    ]
  },
  "0174": {
    "id": "0174",
    "filename": "0174.jpg",
    "imagePath": "/images/0174.jpg",
    "meanConfidence": 0.34,
    "tokens": [
      { "text": "Shaheed", "conf": 0.78 },
      { "text": "Suhrawardy", "conf": 0.72 },
      { "text": "Hospital", "conf": 0.81 },
      { "text": "Tab", "conf": 0.55 },
      { "text": "Histal", "conf": 0.52 },
      { "text": "4mg", "conf": 0.58 },
      { "text": "০+০+১", "conf": 0.49 },
      { "text": "৩০", "conf": 0.45 },
      { "text": "দিন", "conf": 0.62 }
    ],
    "candidates": [
      {
        "id": 1,
        "name": "Histal",
        "strength": "4 mg",
        "dose": "1 tablet",
        "frequency": "০+০+১",
        "duration": "30 days",
        "route": "Oral",
        "confidence": 0.52
      }
    ]
  },
  "0001": {
    "id": "0001",
    "filename": "0001.jpg",
    "imagePath": "/images/0001.jpg",
    "meanConfidence": 0.48,
    "tokens": [
      { "text": "Clinical", "conf": 0.82 },
      { "text": "Examination", "conf": 0.79 },
      { "text": "Diagnosis", "conf": 0.89 },
      { "text": "Inj", "conf": 0.51 },
      { "text": "Xgeva", "conf": 0.44 },
      { "text": "120mg", "conf": 0.83 },
      { "text": "Tab", "conf": 0.60 },
      { "text": "Ultracet", "conf": 0.55 }
    ],
    "candidates": [
      {
        "id": 1,
        "name": "Xgeva",
        "strength": "120 mg",
        "dose": "1 vial",
        "frequency": "Once as needed",
        "duration": "",
        "route": "Subcutaneous",
        "confidence": 0.44
      }
    ]
  }
};

let currentSample = null;

function loadSample(sampleId) {
  const sample = SAMPLES[sampleId];
  if (!sample) return;
  currentSample = sample;

  // Reset verification UI
  document.getElementById("verification-status-badge").className = "status-tag status-unverified";
  document.getElementById("verification-status-badge").textContent = "UNVERIFIED_REQUIRES_HUMAN_REVIEW";
  document.getElementById("image-status-tag").className = "status-tag status-unverified";
  document.getElementById("image-status-tag").textContent = "STATUS: UNVERIFIED";
  document.getElementById("verified-panel").style.display = "none";
  document.getElementById("legal-confirm-checkbox").checked = false;
  document.getElementById("btn-verify").className = "btn btn-primary";
  document.getElementById("btn-verify").textContent = "✅ Confirm Human Verification & Enable Staged Reminders";

  // Load image
  document.getElementById("prescription-image").src = sample.imagePath;

  // Render OCR stream with uncertainty highlighting
  const streamEl = document.getElementById("ocr-stream");
  streamEl.innerHTML = sample.tokens.map(t => {
    if (t.conf < 0.60) {
      return `<span class="uncertain-token" title="Low OCR Confidence: ${(t.conf * 100).toFixed(0)}% (REVIEW REQUIRED)">${t.text}</span>`;
    } else {
      return `<span class="confident-token" title="OCR Confidence: ${(t.conf * 100).toFixed(0)}%">${t.text}</span>`;
    }
  }).join(" ");

  // Render Candidates form
  const container = document.getElementById("candidates-container");
  container.innerHTML = sample.candidates.map((c, i) => `
    <div class="candidate-item" id="cand-item-${i}">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 0.85rem;">Medication Candidate #${c.id}</span>
        <span style="font-size: 0.75rem; color: ${c.confidence < 0.6 ? '#dc2626' : '#0284c7'}; font-weight: 600;">
          Confidence: ${(c.confidence * 100).toFixed(0)}% ${c.confidence < 0.6 ? '(REVIEW MANDATORY)' : ''}
        </span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Brand / Generic Name:</label>
          <input type="text" id="cand-name-${i}" value="${c.name}" class="${c.confidence < 0.6 ? 'uncertain-field' : ''}">
        </div>
        <div class="form-group">
          <label>Strength & Unit:</label>
          <input type="text" id="cand-strength-${i}" value="${c.strength}" placeholder="e.g. 500 mg, 20 ml">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Frequency / Timing:</label>
          <input type="text" id="cand-freq-${i}" value="${c.frequency}" placeholder="e.g. ১+০+১, twice daily">
        </div>
        <div class="form-group">
          <label>Duration:</label>
          <input type="text" id="cand-dur-${i}" value="${c.duration}" placeholder="e.g. ৭ দিন, 1 month">
        </div>
      </div>
    </div>
  `).join("");
}

document.getElementById("prescription-selector").addEventListener("change", (e) => {
  loadSample(e.target.value);
});

document.getElementById("btn-verify").addEventListener("click", () => {
  const clinicianName = document.getElementById("clinician-name").value.trim();
  const clinicianBmdc = document.getElementById("clinician-bmdc").value.trim();
  const confirmed = document.getElementById("legal-confirm-checkbox").checked;

  if (!clinicianName) {
    alert("Safety Gate Halt: Clinician Full Name is required for verification sign-off.");
    return;
  }
  if (!clinicianBmdc) {
    alert("Safety Gate Halt: BMDC Registration ID is required for verification sign-off.");
    return;
  }
  if (!confirmed) {
    alert("Safety Gate Halt: You must certify having cross-verified the prescription against the physical image.");
    return;
  }

  // Collect verified orders
  const verifiedOrders = currentSample.candidates.map((c, i) => ({
    medicine_name: document.getElementById(`cand-name-${i}`).value.trim(),
    strength: document.getElementById(`cand-strength-${i}`).value.trim(),
    frequency: document.getElementById(`cand-freq-${i}`).value.trim(),
    duration: document.getElementById(`cand-dur-${i}`).value.trim()
  }));

  // Update Status UI
  document.getElementById("verification-status-badge").className = "status-tag status-verified";
  document.getElementById("verification-status-badge").textContent = "VERIFIED_BY_HUMAN";
  document.getElementById("image-status-tag").className = "status-tag status-verified";
  document.getElementById("image-status-tag").textContent = "STATUS: VERIFIED";

  // Build FHIR R4 JSON
  const fhirDoc = {
    resourceType: "MedicationRequest",
    id: `prescription-${currentSample.id}`,
    status: "active",
    intent: "order",
    authoredOn: new Date().toISOString().split("T")[0],
    requester: {
      display: `${clinicianName} (BMDC: ${clinicianBmdc})`
    },
    note: [{ text: "Verified against physical prescription scan by licensed practitioner." }],
    dosageInstruction: verifiedOrders.map(o => ({
      text: `${o.medicine_name} ${o.strength} — ${o.frequency} (${o.duration || 'duration not specified'})`
    }))
  };

  document.getElementById("verification-summary-text").textContent = 
    `Verified by ${clinicianName} (${clinicianBmdc}) at ${new Date().toLocaleTimeString()}. Automated patient dosage reminders now staged for delivery.`;
  document.getElementById("fhir-json-preview").textContent = JSON.stringify(fhirDoc, null, 2);
  document.getElementById("verified-panel").style.display = "block";
});

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  loadSample("0052");
});
