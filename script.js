// DOM Elements
const habitContainer = document.getElementById("habitContainer");
const progressBar = document.getElementById("progressBar");
const darkModeToggle = document.getElementById("darkModeToggle");
const showAddModal = document.getElementById("showAddModal");
const addHabitModal = document.getElementById("addHabitModal");
const closeBtn = document.querySelector(".close-btn");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitNameInput = document.getElementById("habitName");
const habitCategoryInput = document.getElementById("habitCategory");
const habitTargetInput = document.getElementById("habitTarget");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
let habitChart, monthlyChart;

// Category colors for monthly chart
const categoryColors = {
  health: '#e74c3c',
  study: '#3498db',
  exercise: '#2ecc71',
  other: '#f1c40f'
};

// Load habits from localStorage
let habits = JSON.parse(localStorage.getItem("habits")) || [];
displayHabits();

// Show Add Modal
showAddModal.addEventListener("click", () => { addHabitModal.style.display = "flex"; });
closeBtn.addEventListener("click", () => { addHabitModal.style.display = "none"; });

// Dark Mode Toggle
darkModeToggle.addEventListener("click", () => { document.body.classList.toggle("dark-mode"); });

// Add Habit
addHabitBtn.addEventListener("click", () => {
  const name = habitNameInput.value.trim();
  const category = habitCategoryInput.value;
  const target = parseInt(habitTargetInput.value) || 1;
  if (!name) return alert("Enter habit name!");

  const newHabit = {
    id: Date.now(),
    name,
    category,
    target,
    done: 0,
    streak: 0,
    lastCompleted: null,
    completionHistory: {}
  };

  habits.push(newHabit);
  saveAndDisplay();
  addHabitModal.style.display = "none";
  habitNameInput.value = "";
  habitTargetInput.value = "";
});

// Display Habits
function displayHabits() {
  habitContainer.innerHTML = "";
  let filteredHabits = habits;

  // Apply filters
  const categoryVal = categoryFilter.value;
  const statusVal = statusFilter.value;

  if (categoryVal !== "all") filteredHabits = filteredHabits.filter(h => h.category === categoryVal);
  if (statusVal !== "all") {
    filteredHabits = filteredHabits.filter(h => (statusVal === "done") ? h.done >= h.target : h.done < h.target);
  }

  filteredHabits.forEach(habit => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="habit-info">
        <span>${habit.name} (${habit.category})</span>
        <span>Progress: ${habit.done}/${habit.target} | Streak: ${habit.streak} 🔥</span>
      </div>
      <div class="habit-buttons">
        <button class="complete-btn">✔️</button>
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    // Complete Button
    li.querySelector(".complete-btn").addEventListener("click", () => {
      const today = new Date();
      const dayLabel = today.toLocaleDateString('en-US', { weekday: 'short' });

      if (!habit.completionHistory) habit.completionHistory = {};
      habit.completionHistory[dayLabel] = (habit.completionHistory[dayLabel] || 0) + 1;

      habit.done += 1;

      // Streak logic
      if (habit.lastCompleted) {
        const last = new Date(habit.lastCompleted);
        const diff = (today - last) / (1000*60*60*24);
        habit.streak = (diff === 1) ? habit.streak + 1 : 1;
      } else habit.streak = 1;

      habit.lastCompleted = today.toDateString();
      saveAndDisplay();
    });

    // Edit Button
    li.querySelector(".edit-btn").addEventListener("click", () => {
      const newName = prompt("Edit Habit Name:", habit.name);
      if (newName) habit.name = newName;
      saveAndDisplay();
    });

    // Delete Button
    li.querySelector(".delete-btn").addEventListener("click", () => {
      habits = habits.filter(h => h.id !== habit.id);
      saveAndDisplay();
    });

    habitContainer.appendChild(li);
  });

  updateProgress();
  updateWeeklyChart();
  updateMonthlyChart();
}

// Update Progress Bar
function updateProgress() {
  const totalTarget = habits.reduce((sum, h) => sum + h.target, 0) || 1;
  const totalDone = habits.reduce((sum, h) => sum + h.done, 0);
  const percent = (totalDone / totalTarget) * 100;
  progressBar.style.width = percent + "%";
}

// Weekly Chart
function updateWeeklyChart() {
  const ctx = document.getElementById('habitChart').getContext('2d');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  const dataCounts = days.map(dayLabel => {
    let count = 0;
    habits.forEach(h => { count += h.completionHistory[dayLabel] || 0; });
    return count;
  });

  if (habitChart) habitChart.destroy();

  habitChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ label: 'Total Habit Completions', data: dataCounts, backgroundColor: '#4caf50' }] },
    options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Habits Completed This Week' } }, scales: { y: { beginAtZero: true, precision: 0 } } }
  });
}

// Monthly Chart
function updateMonthlyChart() {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const labels = [];
  const datasets = [];

  // Initialize datasets for each category
  Object.keys(categoryColors).forEach(cat => {
    datasets.push({ label: cat.charAt(0).toUpperCase() + cat.slice(1), data: Array(daysInMonth).fill(0), backgroundColor: categoryColors[cat] });
  });

  for (let i = 1; i <= daysInMonth; i++) labels.push(i);

  habits.forEach(habit => {
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const completed = habit.completionHistory[dayLabel] || 0;
      const datasetIndex = Object.keys(categoryColors).indexOf(habit.category);
      if (datasetIndex !== -1) datasets[datasetIndex].data[day-1] += completed;
    }
  });

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: { responsive: true, plugins: { title: { display: true, text: 'Monthly Habit Completions by Category' }, legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, precision: 0 } } }
  });
}

// Save & Refresh
function saveAndDisplay() {
  localStorage.setItem("habits", JSON.stringify(habits));
  displayHabits();
}

// Filters
categoryFilter.addEventListener("change", displayHabits);
statusFilter.addEventListener("change", displayHabits);

// Close modal on outside click
window.addEventListener("click", e => {
  if (e.target === addHabitModal) addHabitModal.style.display = "none";
});
