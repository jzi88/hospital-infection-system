const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// =====================================================
// DEPARTMENTS
// =====================================================

app.get("/api/departments", async (req, res) => {
    const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("department_id");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


// =====================================================
// PATIENTS
// =====================================================

app.get("/api/patients", async (req, res) => {
    const { data, error } = await supabase
        .from("patients")
        .select(`
            patient_id,
            department_id,
            admission_date,
            discharge_date,
            age,
            gender,
            infection_status,
            microbe,
            created_at,
            departments (
                code,
                name
            )
        `)
        .order("patient_id", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/patients", async (req, res) => {
    const {
        department_id,
        admission_date,
        discharge_date,
        age,
        gender,
        infection_status,
        microbe
    } = req.body;

    const { data, error } = await supabase
        .from("patients")
        .insert([{
            department_id,
            admission_date,
            discharge_date: discharge_date || null,
            age,
            gender,
            infection_status: infection_status || false,
            microbe: infection_status ? microbe : null
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// APPOINTMENTS
// =====================================================

app.get("/api/appointments", async (req, res) => {
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                patient_id,
                age,
                gender
            ),
            departments (
                code,
                name
            )
        `)
        .order("appointment_date", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/appointments", async (req, res) => {
    const {
        patient_id,
        department_id,
        appointment_date,
        appointment_type,
        status
    } = req.body;

    const { data, error } = await supabase
        .from("appointments")
        .insert([{
            patient_id,
            department_id,
            appointment_date,
            appointment_type,
            status
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// LAB RESULTS
// =====================================================

app.get("/api/lab-results", async (req, res) => {
    const { data, error } = await supabase
        .from("lab_results")
        .select(`
            *,
            patients (
                patient_id,
                age,
                gender
            ),
            departments (
                code,
                name
            )
        `)
        .order("test_date", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/lab-results", async (req, res) => {
    const {
        patient_id,
        department_id,
        test_date,
        test_type,
        result_value,
        result_status
    } = req.body;

    const { data, error } = await supabase
        .from("lab_results")
        .insert([{
            patient_id,
            department_id,
            test_date,
            test_type,
            result_value,
            result_status
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// SURFACES
// =====================================================

app.get("/api/surfaces", async (req, res) => {
    const { data, error } = await supabase
        .from("surfaces")
        .select(`
            *,
            departments (
                code,
                name
            )
        `)
        .order("surface_id");

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/surfaces", async (req, res) => {
    const {
        department_id,
        surface_name,
        surface_type
    } = req.body;

    const { data, error } = await supabase
        .from("surfaces")
        .insert([{
            department_id,
            surface_name,
            surface_type
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// SURFACE SAMPLES
// =====================================================

app.get("/api/surface-samples", async (req, res) => {
    const { data, error } = await supabase
        .from("surface_samples")
        .select(`
            *,
            surfaces (
                surface_name,
                surface_type
            ),
            departments (
                code,
                name
            )
        `)
        .order("sample_date", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/surface-samples", async (req, res) => {
    const {
        surface_id,
        department_id,
        sample_date,
        contamination_level,
        sample_status,
        microbe
    } = req.body;

    const { data, error } = await supabase
        .from("surface_samples")
        .insert([{
            surface_id,
            department_id,
            sample_date,
            contamination_level,
            sample_status,
            microbe: sample_status === "Positive" ? microbe : null
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// CLEANING LOGS
// =====================================================

app.get("/api/cleaning-logs", async (req, res) => {
    const { data, error } = await supabase
        .from("cleaning_logs")
        .select(`
            *,
            surfaces (
                surface_name,
                surface_type
            ),
            departments (
                code,
                name
            )
        `)
        .order("cleaning_time", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.post("/api/cleaning-logs", async (req, res) => {
    const {
        surface_id,
        department_id,
        cleaning_time,
        cleaning_method,
        effectiveness_score
    } = req.body;

    const { data, error } = await supabase
        .from("cleaning_logs")
        .insert([{
            surface_id,
            department_id,
            cleaning_time,
            cleaning_method,
            effectiveness_score
        }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});


// =====================================================
// PREDICTIONS
// =====================================================

app.get("/api/predictions", async (req, res) => {
    const { data, error } = await supabase
        .from("predictions")
        .select(`
            *,
            departments (
                code,
                name
            )
        `)
        .order("prediction_date", { ascending: false })
        .order("risk_percentage", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.get("/api/predictions/latest", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("predictions")
        .select(`
            *,
            departments (
                code,
                name
            )
        `)
        .eq("prediction_date", today)
        .order("risk_percentage", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


// =====================================================
// ALERTS
// =====================================================

app.get("/api/alerts", async (req, res) => {
    const { data, error } = await supabase
        .from("alerts")
        .select(`
            *,
            departments (
                code,
                name
            )
        `)
        .order("alert_date", { ascending: false })
        .order("risk_percentage", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});


app.patch("/api/alerts/:id/resolve", async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from("alerts")
        .update({ status: "Resolved" })
        .eq("alert_id", id)
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});


// =====================================================
// SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hospital System running on http://localhost:${PORT}`);
});