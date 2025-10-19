// Quick verification script for interview-specific questions
// Usage: node scripts/verifyQuestions.js
// Make sure backend is running (default http://localhost:3001)

const axios = require("axios");

const BASE = process.env.BACKEND_URL || "http://localhost:3001";
let populateErrorTable = null;
try {
  populateErrorTable = require("../utils/logger").populateErrorTable;
} catch (e) {
  // script may be run standalone without full project context; fallback to null
  populateErrorTable = null;
}

async function run() {
  try {
  const interviewID = process.argv[2] || "test-interview-verify";

    const sampleQuestions = [
      {
        questionTitle: "Sample Verify Question",
        questionLevel: "1",
        questionCategory: "General",
        questionExample: "Example",
        questionOutput: "Output",
      },
    ];

  // posting finalQuestions to /interview/questions
    const res = await axios.post(`${BASE}/interview/questions`, {
      interviewID,
      questions: sampleQuestions,
    });

  // save response received

  // fetching interview to verify finalQuestions
    const fetchRes = await axios.post(`${BASE}/interview/findInterviewfilter`, {
      interviewID,
    });
  // fetch response received

    if (fetchRes.data && fetchRes.data.data && fetchRes.data.data.length) {
      const interview = fetchRes.data.data[0];
      const stored = interview.finalQuestions || [];
      // stored finalQuestions available
      process.exit(0);
    } else {
      // Use logger if available (when run within project), otherwise fallback to console
      try {
        const { populateErrorTable } = require("../utils/logger");
        populateErrorTable(
          "error",
          "Interview not found or no data returned.",
          {}
        );
      } catch (e) {
        // no logger available; exit with error
      }
      process.exit(2);
    }
  } catch (e) {
    try {
      const { populateErrorTable } = require("../utils/logger");
      populateErrorTable("error", "Error during verification", {
        message: e && e.message ? e.message : e,
        response: e.response ? e.response.data : undefined,
      });
    } catch (err) {
      // fallback to process exit with error status
    }
    process.exit(3);
  }
}

run();
