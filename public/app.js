const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

let departments = [];
let patients = [];
let surfaces = [];


// =====================================================
// API
// =====================================================

async function api(url, options = {}) {

    const response = await fetch(url, options);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }

    return data;
}


// =====================================================
// LOAD BASIC DATA
// =====================================================

async function loadDepartments() {
    departments = await api("/api/departments");
}

async function loadPatients() {
    patients = await api("/api/patients");
}

async function loadSurfaces() {
    surfaces = await api("/api/surfaces");
}


// =====================================================
// PATIENTS
// =====================================================

async function showPatients() {

    pageTitle.textContent = "Patients";

    await loadPatients();

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h2>Patients</h2>
                <p>Manage hospital patients and infection status.</p>
            </div>

            <button class="btn" onclick="showPatientForm()">
                + Add Patient
            </button>

        </div>

        <div class="card">

            <table>

                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Department</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Admission</th>
                        <th>Infection</th>
                        <th>Microbe</th>
                    </tr>
                </thead>

                <tbody>

                    ${patients.map(p => `

                        <tr>

                            <td>#${p.patient_id}</td>

                            <td>
                                ${p.departments?.code || "-"}
                            </td>

                            <td>${p.age}</td>

                            <td>${p.gender}</td>

                            <td>${p.admission_date}</td>

                            <td>

                                <span class="status ${p.infection_status ? "positive" : "normal"}">

                                    ${p.infection_status ? "Positive" : "Normal"}

                                </span>

                            </td>

                            <td>${p.microbe || "-"}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


// =====================================================
// PATIENT FORM
// =====================================================

async function showPatientForm() {

    await loadDepartments();

    pageTitle.textContent = "Add Patient";

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h2>Add Patient</h2>
                <p>Enter patient information.</p>
            </div>

        </div>


        <div class="card form-card">

            <form id="patientForm">

                <div class="form-grid">

                    <div class="field">

                        <label>Department</label>

                        <select id="patientDepartment" required>

                            <option value="">Select department</option>

                            ${departments.map(d => `

                                <option value="${d.department_id}">
                                    ${d.code} — ${d.name}
                                </option>

                            `).join("")}

                        </select>

                    </div>


                    <div class="field">

                        <label>Age</label>

                        <input
                            type="number"
                            id="patientAge"
                            min="0"
                            max="100"
                            required
                        >

                    </div>


                    <div class="field">

                        <label>Gender</label>

                        <select id="patientGender" required>

                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>

                        </select>

                    </div>


                    <div class="field">

                        <label>Admission Date</label>

                        <input
                            type="date"
                            id="admissionDate"
                            required
                        >

                    </div>


                    <div class="field">

                        <label>Discharge Date</label>

                        <input
                            type="date"
                            id="dischargeDate"
                        >

                    </div>


                    <div class="field">

                        <label>Infection Status</label>

                        <select id="infectionStatus">

                            <option value="false">
                                Normal
                            </option>

                            <option value="true">
                                Infected
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label>Microbe</label>

                        <select id="microbe">

                            <option value="">None</option>
                            <option value="Microbe X">Microbe X</option>
                            <option value="Microbe Y">Microbe Y</option>
                            <option value="Microbe Z">Microbe Z</option>

                        </select>

                    </div>

                </div>


                <div class="form-actions">

                    <button type="submit" class="btn">
                        Save Patient
                    </button>

                    <button
                        type="button"
                        class="btn"
                        style="background:#68737d"
                        onclick="showPatients()"
                    >
                        Cancel
                    </button>

                </div>

            </form>

        </div>
    `;


    document
        .getElementById("patientForm")
        .addEventListener("submit", savePatient);
}


async function savePatient(event) {

    event.preventDefault();

    const infectionStatus =
        document.getElementById("infectionStatus").value === "true";


    const patient = {

        department_id:
            Number(document.getElementById("patientDepartment").value),

        admission_date:
            document.getElementById("admissionDate").value,

        discharge_date:
            document.getElementById("dischargeDate").value || null,

        age:
            Number(document.getElementById("patientAge").value),

        gender:
            document.getElementById("patientGender").value,

        infection_status:
            infectionStatus,

        microbe:
            infectionStatus
                ? document.getElementById("microbe").value || null
                : null
    };


    try {

        await api("/api/patients", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(patient)

        });

        alert("Patient added successfully.");

        showPatients();

    } catch (error) {

        alert(error.message);

    }
}


// =====================================================
// APPOINTMENTS (logging form only, no table)
// =====================================================

async function showAppointments() {

    await loadPatients();

    pageTitle.textContent = "Appointments";

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Log Appointment</h2>
                <p>Record a new patient appointment.</p>
            </div>
        </div>

        <div class="card form-card">

            <form id="appointmentForm">

                <div class="form-grid">

                    <div class="field">
                        <label>Patient</label>
                        <select id="apptPatient" required>
                            <option value="">Select patient</option>
                            ${patients.map(p => `
                                <option value="${p.patient_id}">
                                    #${p.patient_id} — ${p.departments?.code || "-"} — Age ${p.age}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field">
                        <label>Appointment Date</label>
                        <input type="date" id="apptDate" required>
                    </div>

                    <div class="field">
                        <label>Type</label>
                        <select id="apptType" required>
                            <option value="Checkup">Checkup</option>
                            <option value="Follow-up">Follow-up</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Procedure">Procedure</option>
                            <option value="Emergency">Emergency</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Status</label>
                        <select id="apptStatus" required>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                </div>

                <div class="form-actions">
                    <button type="submit" class="btn">Save Appointment</button>
                </div>

            </form>

        </div>
    `;

    document
        .getElementById("appointmentForm")
        .addEventListener("submit", saveAppointment);
}

async function saveAppointment(event) {

    event.preventDefault();

    const patientId = Number(document.getElementById("apptPatient").value);
    const patient = patients.find(p => p.patient_id === patientId);

    if (!patient) {
        alert("Please select a valid patient.");
        return;
    }

    const appointment = {
        patient_id: patientId,
        department_id: patient.department_id,
        appointment_date: document.getElementById("apptDate").value,
        appointment_type: document.getElementById("apptType").value,
        status: document.getElementById("apptStatus").value
    };

    try {

        await api("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appointment)
        });

        alert("Appointment logged successfully.");
        showAppointments();

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// LABORATORY (logging form only, no table)
// =====================================================

async function showLaboratory() {

    await loadPatients();

    pageTitle.textContent = "Laboratory";

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Log Lab Result</h2>
                <p>Record a new laboratory test result.</p>
            </div>
        </div>

        <div class="card form-card">

            <form id="labForm">

                <div class="form-grid">

                    <div class="field">
                        <label>Patient</label>
                        <select id="labPatient" required>
                            <option value="">Select patient</option>
                            ${patients.map(p => `
                                <option value="${p.patient_id}">
                                    #${p.patient_id} — ${p.departments?.code || "-"} — Age ${p.age}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field">
                        <label>Test Date</label>
                        <input type="date" id="labDate" required>
                    </div>

                    <div class="field">
                        <label>Test Type</label>
                        <select id="labType" required>
                            <option value="WBC">WBC</option>
                            <option value="CRP">CRP</option>
                            <option value="Procalcitonin">Procalcitonin</option>
                            <option value="Temperature Marker">Temperature Marker</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Result Value</label>
                        <input type="number" step="0.01" id="labValue" required>
                    </div>

                    <div class="field">
                        <label>Result Status</label>
                        <select id="labStatus" required>
                            <option value="Normal">Normal</option>
                            <option value="Positive">Positive</option>
                        </select>
                    </div>

                </div>

                <div class="form-actions">
                    <button type="submit" class="btn">Save Lab Result</button>
                </div>

            </form>

        </div>
    `;

    document
        .getElementById("labForm")
        .addEventListener("submit", saveLabResult);
}

async function saveLabResult(event) {

    event.preventDefault();

    const patientId = Number(document.getElementById("labPatient").value);
    const patient = patients.find(p => p.patient_id === patientId);

    if (!patient) {
        alert("Please select a valid patient.");
        return;
    }

    const labResult = {
        patient_id: patientId,
        department_id: patient.department_id,
        test_date: document.getElementById("labDate").value,
        test_type: document.getElementById("labType").value,
        result_value: Number(document.getElementById("labValue").value),
        result_status: document.getElementById("labStatus").value
    };

    try {

        await api("/api/lab-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(labResult)
        });

        alert("Lab result logged successfully.");
        showLaboratory();

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// SURFACE SAMPLES (logging form only, no table)
// =====================================================

async function showSamples() {

    await loadSurfaces();

    pageTitle.textContent = "Surface Samples";

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Log Surface Sample</h2>
                <p>Record a new contamination test on a surface.</p>
            </div>
        </div>

        <div class="card form-card">

            <form id="sampleForm">

                <div class="form-grid">

                    <div class="field">
                        <label>Surface</label>
                        <select id="sampleSurface" required>
                            <option value="">Select surface</option>
                            ${surfaces.map(s => `
                                <option value="${s.surface_id}">
                                    ${s.departments?.code || "-"} — ${s.surface_name}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field">
                        <label>Sample Date</label>
                        <input type="date" id="sampleDate" required>
                    </div>

                    <div class="field">
                        <label>Contamination Level</label>
                        <input type="number" step="0.01" id="sampleLevel" required>
                    </div>

                    <div class="field">
                        <label>Sample Status</label>
                        <select id="sampleStatus" required>
                            <option value="Negative">Negative</option>
                            <option value="Positive">Positive</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Microbe</label>
                        <select id="sampleMicrobe">
                            <option value="">None</option>
                            <option value="Microbe X">Microbe X</option>
                            <option value="Microbe Y">Microbe Y</option>
                            <option value="Microbe Z">Microbe Z</option>
                        </select>
                    </div>

                </div>

                <div class="form-actions">
                    <button type="submit" class="btn">Save Sample</button>
                </div>

            </form>

        </div>
    `;

    document
        .getElementById("sampleForm")
        .addEventListener("submit", saveSample);
}

async function saveSample(event) {

    event.preventDefault();

    const surfaceId = Number(document.getElementById("sampleSurface").value);
    const surface = surfaces.find(s => s.surface_id === surfaceId);

    if (!surface) {
        alert("Please select a valid surface.");
        return;
    }

    const status = document.getElementById("sampleStatus").value;

    const sample = {
        surface_id: surfaceId,
        department_id: surface.department_id,
        sample_date: document.getElementById("sampleDate").value,
        contamination_level: Number(document.getElementById("sampleLevel").value),
        sample_status: status,
        microbe: status === "Positive"
            ? (document.getElementById("sampleMicrobe").value || null)
            : null
    };

    try {

        await api("/api/surface-samples", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sample)
        });

        alert("Surface sample logged successfully.");
        showSamples();

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// CLEANING (logging form only, no table)
// =====================================================

async function showCleaning() {

    await loadSurfaces();

    pageTitle.textContent = "Cleaning";

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Log Cleaning</h2>
                <p>Record a completed cleaning operation on a surface.</p>
            </div>
        </div>

        <div class="card form-card">

            <form id="cleaningForm">

                <div class="form-grid">

                    <div class="field">
                        <label>Surface</label>
                        <select id="cleanSurface" required>
                            <option value="">Select surface</option>
                            ${surfaces.map(s => `
                                <option value="${s.surface_id}">
                                    ${s.departments?.code || "-"} — ${s.surface_name}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field">
                        <label>Cleaning Time</label>
                        <input type="datetime-local" id="cleanTime" required>
                    </div>

                    <div class="field">
                        <label>Method</label>
                        <select id="cleanMethod" required>
                            <option value="Disinfectant">Disinfectant</option>
                            <option value="Alcohol">Alcohol</option>
                            <option value="Chlorine">Chlorine</option>
                            <option value="Standard Cleaning">Standard Cleaning</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Effectiveness Score (0-100)</label>
                        <input type="number" step="0.01" min="0" max="100" id="cleanScore" required>
                    </div>

                </div>

                <div class="form-actions">
                    <button type="submit" class="btn">Save Cleaning Log</button>
                </div>

            </form>

        </div>
    `;

    document
        .getElementById("cleaningForm")
        .addEventListener("submit", saveCleaning);
}

async function saveCleaning(event) {

    event.preventDefault();

    const surfaceId = Number(document.getElementById("cleanSurface").value);
    const surface = surfaces.find(s => s.surface_id === surfaceId);

    if (!surface) {
        alert("Please select a valid surface.");
        return;
    }

    const cleaning = {
        surface_id: surfaceId,
        department_id: surface.department_id,
        cleaning_time: new Date(document.getElementById("cleanTime").value).toISOString(),
        cleaning_method: document.getElementById("cleanMethod").value,
        effectiveness_score: Number(document.getElementById("cleanScore").value)
    };

    try {

        await api("/api/cleaning-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleaning)
        });

        alert("Cleaning log saved successfully.");
        showCleaning();

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// MICROBE GUIDE (read-only reference)
// =====================================================

async function showMicrobeGuide() {

    pageTitle.textContent = "Microbe Guide";

    const reference = await api("/api/microbe-reference");

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Microbe Reference</h2>
                <p>Logic used to link department conditions to each predicted microbe.</p>
            </div>
        </div>

        <div class="card">

            <table>

                <thead>
                    <tr>
                        <th>Microbe</th>
                        <th>Condition</th>
                        <th>Rationale</th>
                    </tr>
                </thead>

                <tbody>

                    ${reference.map(r => `

                        <tr>
                            <td><strong>${r.microbe}</strong></td>
                            <td>${r.condition_description}</td>
                            <td>${r.rationale}</td>
                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


// =====================================================
// PREDICTIONS
// =====================================================

function riskClass(risk) {
    if (risk >= 70) return "critical";
    if (risk >= 50) return "high";
    if (risk >= 30) return "medium";
    return "low";
}

async function showPredictions() {

    pageTitle.textContent = "Predictions";

    const predictions = await api("/api/predictions");

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Infection Risk Predictions</h2>
                <p>Model-generated risk percentage per department.</p>
            </div>
        </div>

        <div class="card">

            <table>

                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Risk %</th>
                        <th>Type</th>
                        <th>Predicted Microbe</th>
                        <th>Model</th>
                    </tr>
                </thead>

                <tbody>

                    ${predictions.map(p => `

                        <tr>
                            <td>${p.prediction_date}</td>
                            <td>${p.departments?.code || "-"}</td>
                            <td>
                                <span class="status ${riskClass(p.risk_percentage)}">
                                    ${p.risk_percentage}%
                                </span>
                            </td>
                            <td>${p.infection_type || "-"}</td>
                            <td>${p.predicted_microbe || "-"}</td>
                            <td>${p.model_version || "-"}</td>
                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


// =====================================================
// ALERTS
// =====================================================

async function resolveAlert(alertId) {

    try {

        await api(`/api/alerts/${alertId}/resolve`, {
            method: "PATCH"
        });

        showAlerts();

    } catch (error) {

        alert(error.message);

    }
}

async function showAlerts() {

    pageTitle.textContent = "Alerts";

    const alerts = await api("/api/alerts/today");

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h2>Active Alerts</h2>
                <p>Departments currently flagged as high risk.</p>
            </div>
        </div>

        <div class="card">

            <table>

                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Risk %</th>
                        <th>Severity</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>

                    ${alerts.map(a => `

                        <tr>
                            <td>${a.alert_date}</td>
                            <td>${a.departments?.code || "-"}</td>
                            <td>${a.risk_percentage}%</td>
                            <td>
                                <span class="status ${riskClass(a.risk_percentage)}">
                                    ${a.severity}
                                </span>
                            </td>
                            <td>${a.message}</td>
                            <td>${a.status}</td>
                            <td>
                                ${a.status === "Active" ? `
                                    <button class="btn" onclick="resolveAlert(${a.alert_id})">
                                        Resolve
                                    </button>
                                ` : ""}
                            </td>
                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}


// =====================================================
// NAVIGATION
// =====================================================

document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll(".nav-btn")
            .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");


        const page = button.dataset.page;


        if (page === "patients")
            showPatients();

        if (page === "appointments")
            showAppointments();

        if (page === "laboratory")
            showLaboratory();

        if (page === "samples")
            showSamples();

        if (page === "cleaning")
            showCleaning();

        if (page === "predictions")
            showPredictions();

        if (page === "microbe-guide")
            showMicrobeGuide();

        if (page === "alerts")
            showAlerts();

    });

});


// =====================================================
// START
// =====================================================

showPatients();
