// src/main/google.js
// TODO: wire to your existing Google Calendar sync logic
async function syncNow() {
  // Call your existing sync module/function here (Notion -> Google and/or Google -> Notion)
  // For now, just simulate a small delay.
  await new Promise(res => setTimeout(res, 300));
  return true;
}
module.exports = { syncNow };