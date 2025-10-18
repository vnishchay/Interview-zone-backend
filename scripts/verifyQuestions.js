// Quick verification script for interview-specific questions
// Usage: node scripts/verifyQuestions.js
// Make sure backend is running (default http://localhost:3001)

const axios = require("axios");

const BASE = process.env.BACKEND_URL || "http://localhost:3001";

async function run() {
  try {
    const interviewID = process.argv[2] || "test-interview-verify";
    console.log("Using interviewID:", interviewID);

    const sampleQuestions = [
      {
        questionTitle: "Sample Verify Question",
        questionLevel: "1",
        questionCategory: "General",
        questionExample: "Example",
        questionOutput: "Output",
      },
    ];

    console.log("Posting finalQuestions to /interview/questions");
    const res = await axios.post(`${BASE}/interview/questions`, {
      interviewID,
      questions: sampleQuestions,
    });

    console.log("Save response:", res.data);

    console.log("Fetching interview by filter to verify finalQuestions...");
    const fetchRes = await axios.post(`${BASE}/interview/findInterviewfilter`, {
      interviewID,
    });
    console.log("Fetch response:", fetchRes.data);

    if (fetchRes.data && fetchRes.data.data && fetchRes.data.data.length) {
      const interview = fetchRes.data.data[0];
      const stored = interview.finalQuestions || [];
      console.log("Stored finalQuestions length:", stored.length);
      console.log("Stored finalQuestions:", stored);
      process.exit(0);
    } else {
      console.error("Interview not found or no data returned.");
      process.exit(2);
    }
  } catch (e) {
    console.error("Error during verification:", e.message || e);
    if (e.response) console.error("Response data:", e.response.data);
    process.exit(3);
  }
}

run();
