/*
 * Mental Health Signal — Frontend Controller
 *
 * If your FastAPI backend runs on another address,
 * change API_URL below.
 *
 * Example:
 * const API_URL = "http://127.0.0.1:8000/predict";
 */

const API_URL = (window.location.protocol === "file:" || (window.location.port && window.location.port !== "8000" && !window.location.hostname.includes("onrender.com")))
  ? "http://127.0.0.1:8000/predict"
  : "/predict";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const retryBtn = document.getElementById("error-retry-btn");

const states = {
  idle: document.getElementById("state-idle"),
  loading: document.getElementById("state-loading"),
  result: document.getElementById("state-result"),
  error: document.getElementById("state-error")
};

const stressButtons = [...document.querySelectorAll(".seg-btn")];
const stressInput = document.getElementById("stress_level");


// --------------------------------------------------
// STATE MANAGEMENT
// --------------------------------------------------

function showState(name) {
  Object.values(states).forEach((state) => {
    state.hidden = true;
  });

  if (states[name]) {
    states[name].hidden = false;
  }
}


// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

function setFieldError(name, message = "") {
  const field = document.getElementById(name)?.closest(".field");
  const error = document.querySelector(
    `.error-msg[data-for="${name}"]`
  );

  if (field) {
    field.classList.toggle("invalid", Boolean(message));
  }

  if (error) {
    error.textContent = message;
  }
}


function clearErrors() {
  document.querySelectorAll(".error-msg").forEach((element) => {
    element.textContent = "";
  });

  document.querySelectorAll(".field.invalid").forEach((field) => {
    field.classList.remove("invalid");
  });
}


// --------------------------------------------------
// FORM VALIDATION
// --------------------------------------------------

function validateForm() {
  clearErrors();

  let valid = true;

  const requiredFields = [
    "age",
    "gender",
    "country",
    "academic_level",
    "most_used_platform",
    "purpose_of_use",
    "avg_daily_usage_hours",
    "daily_unlocks",
    "study_hours",
    "physical_activity_hours",
    "sleep_hours_per_night"
  ];

  // Check required fields
  requiredFields.forEach((name) => {
    const input = document.getElementById(name);

    if (!input || String(input.value).trim() === "") {
      setFieldError(name, "Please provide this field.");
      valid = false;
    }
  });


  // Check stress level
  if (!stressInput.value) {
    setFieldError(
      "stress_level",
      "Please select a stress level."
    );

    valid = false;
  }


  // Numeric ranges
  const numericRanges = [
    ["age", 10, 100],
    ["avg_daily_usage_hours", 0, 24],
    ["study_hours", 0, 24],
    ["physical_activity_hours", 0, 24],
    ["sleep_hours_per_night", 0, 24]
  ];

  numericRanges.forEach(([name, min, max]) => {
    const input = document.getElementById(name);

    if (!input || input.value === "") {
      return;
    }

    const value = Number(input.value);

    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      setFieldError(
        name,
        `Enter a value between ${min} and ${max}.`
      );

      valid = false;
    }
  });


  // Daily unlock validation
  const unlocks = document.getElementById("daily_unlocks");

  if (
    unlocks.value !== "" &&
    (
      !Number.isFinite(Number(unlocks.value)) ||
      Number(unlocks.value) < 0
    )
  ) {
    setFieldError(
      "daily_unlocks",
      "Enter a valid non-negative number."
    );

    valid = false;
  }

  return valid;
}


// --------------------------------------------------
// GET FORM DATA
// --------------------------------------------------

function getPayload() {
  const data = new FormData(form);

  const payload = Object.fromEntries(data.entries());


  // Convert numeric fields from strings to numbers
  const numericFields = [
    "age",
    "avg_daily_usage_hours",
    "daily_unlocks",
    "study_hours",
    "physical_activity_hours",
    "sleep_hours_per_night"
  ];

  numericFields.forEach((key) => {
    payload[key] = Number(payload[key]);
  });


  return payload;
}


// --------------------------------------------------
// EXTRACT SCORE FROM BACKEND RESPONSE
// --------------------------------------------------

function getScoreFromResponse(data) {

  /*
   * Supports different common FastAPI response formats.
   *
   * Example:
   *
   * {
   *   "score": 6.4
   * }
   *
   * or
   *
   * {
   *   "prediction": 6.4
   * }
   *
   * or
   *
   * {
   *   "mental_health_score": 6.4
   * }
   */

  const possibleKeys = [
    "predicted_mental_health_score",
    "score",
    "mental_health_score",
    "predicted_score",
    "prediction",
    "predicted_value"
  ];


  for (const key of possibleKeys) {

    if (typeof data?.[key] === "number") {
      return data[key];
    }

    if (
      typeof data?.[key] === "string" &&
      data[key].trim() !== ""
    ) {
      const parsed = Number(data[key]);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }


  // Also support:
  //
  // {
  //   "prediction": {
  //      "score": 6.4
  //   }
  // }

  if (
    data?.prediction &&
    typeof data.prediction === "object"
  ) {

    for (const key of possibleKeys) {

      const value = data.prediction[key];

      if (typeof value === "number") {
        return value;
      }

      if (
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }
    }
  }


  return null;
}


// --------------------------------------------------
// SCORE DESCRIPTION
// --------------------------------------------------

function describeScore(score) {

  if (score <= 2.5) {

    return {
      band: "Low signal",
      context:
        "The model places your current routine toward the lower end of the score range."
    };
  }


  if (score <= 5) {

    return {
      band: "Moderate signal",
      context:
        "Your routine shows a mixed pattern across the factors considered by the model."
    };
  }


  if (score <= 7.5) {

    return {
      band: "Elevated signal",
      context:
        "The model identifies a higher level of signal in the submitted routine."
    };
  }


  return {
    band: "High signal",
    context:
      "The model places your submitted pattern toward the higher end of the score range."
  };
}


// --------------------------------------------------
// DISPLAY SCORE
// --------------------------------------------------

function renderScore(score) {

  // Keep score between 0 and 10
  const safeScore = Math.max(
    0,
    Math.min(10, Number(score))
  );

  const number = document.getElementById("score-number");
  const band = document.getElementById("score-band");
  const context = document.getElementById("score-context");
  const circle = document.querySelector(".score-circle");


  // Display number
  number.textContent = safeScore.toFixed(1);


  // Get description
  const description = describeScore(safeScore);

  band.textContent = description.band;
  context.textContent = description.context;


  // Update circular progress
  const degrees = (safeScore / 10) * 360;

  circle.style.background = `
    radial-gradient(
      circle,
      #fff 0 54%,
      transparent 55%
    ),
    conic-gradient(
      var(--sage) 0deg,
      #9cbaa9 ${degrees}deg,
      #e6ece8 ${degrees}deg 360deg
    )
  `;
}


// --------------------------------------------------
// API REQUEST
// --------------------------------------------------

async function predict(payload) {

  const response = await fetch(API_URL, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(payload)
  });


  let data = null;


  // Try to read JSON response
  try {

    data = await response.json();

  } catch {

    // Backend returned something other than JSON

  }


  // HTTP error
  if (!response.ok) {

    const message =
      data?.detail ||
      data?.message ||
      `The prediction request failed with status ${response.status}.`;

    throw new Error(message);
  }


  // Extract prediction score
  const score = getScoreFromResponse(data);


  if (
    score === null ||
    !Number.isFinite(score)
  ) {

    throw new Error(
      "The backend responded successfully, but no numeric prediction score was found. " +
      "Check the response key in getScoreFromResponse()."
    );
  }


  return score;
}


// --------------------------------------------------
// STRESS LEVEL BUTTONS
// --------------------------------------------------

stressButtons.forEach((button) => {

  button.addEventListener("click", () => {

    // Remove active state
    stressButtons.forEach((btn) => {
      btn.classList.remove("active");
    });


    // Activate selected button
    button.classList.add("active");


    // Save selected value
    stressInput.value = button.dataset.value;


    // Remove validation error
    setFieldError("stress_level", "");
  });

});


// --------------------------------------------------
// LIVE FIELD VALIDATION
// --------------------------------------------------

form.querySelectorAll("input, select").forEach((input) => {

  input.addEventListener("input", () => {

    if (input.value.trim() !== "") {
      setFieldError(input.id, "");
    }

  });


  input.addEventListener("change", () => {

    if (input.value.trim() !== "") {
      setFieldError(input.id, "");
    }

  });

});


// --------------------------------------------------
// FORM SUBMISSION
// --------------------------------------------------

form.addEventListener("submit", async (event) => {

  event.preventDefault();


  // Validate form
  if (!validateForm()) {

    const firstInvalid =
      document.querySelector(
        ".field.invalid input, .field.invalid select"
      );

    firstInvalid?.focus();

    return;
  }


  // Loading state
  submitBtn.classList.add("loading");

  showState("loading");


  try {

    // Prepare request
    const payload = getPayload();


    console.log("Sending prediction request:", payload);


    // Call backend
    const score = await predict(payload);


    console.log("Prediction score:", score);


    // Display result
    renderScore(score);

    showState("result");

  } catch (error) {

    console.error(
      "Prediction error:",
      error
    );


    const errorCopy =
      document.getElementById("error-copy");


    errorCopy.textContent =
      error.message ||
      "Unable to connect to the prediction service. " +
      "Please check that your backend is running.";


    showState("error");

  } finally {

    submitBtn.classList.remove("loading");

  }

});


// --------------------------------------------------
// RESET FORM
// --------------------------------------------------

function resetForm() {

  form.reset();


  // Reset stress buttons
  stressButtons.forEach((button) => {
    button.classList.remove("active");
  });


  stressInput.value = "";


  // Clear errors
  clearErrors();


  // Return to initial state
  showState("idle");


  // Scroll to top
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// --------------------------------------------------
// RESET / RETRY BUTTONS
// --------------------------------------------------

resetBtn.addEventListener(
  "click",
  resetForm
);

retryBtn.addEventListener(
  "click",
  resetForm
);