document.addEventListener("DOMContentLoaded", () => {
    // Splash Screen Logic
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app-content');
        
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.classList.add('hidden');
            app.classList.remove('hidden');
        }, 500); // Wartet auf das Ende der CSS-Transition
    }, 1500); // Splash Screen bleibt für 1.5 Sekunden

    // Greeting Logic
    const greetingElement = document.getElementById('greeting');
    const hour = new Date().getHours();
    
    if (hour < 12) {
        greetingElement.textContent = 'Good morning';
    } else if (hour < 18) {
        greetingElement.textContent = 'Good afternoon';
    } else {
        greetingElement.textContent = 'Good evening';
    }

  // Analog Clock Logic
    function updateClock() {
        const now = new Date();

        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours();

        const secondDeg = seconds * 6;
        const minuteDeg = minutes * 6 + seconds * 0.1; // Smooth movement
        const hourDeg = (hours % 12) * 30 + minutes * 0.5; // Modulo 12 für korrekte 12-Stunden-Anzeige hinzugefügt

        document.getElementById("second-hand").style.transform = `rotate(${secondDeg}deg)`;
        document.getElementById("minute-hand").style.transform = `rotate(${minuteDeg}deg)`;
        document.getElementById("hour-hand").style.transform = `rotate(${hourDeg}deg)`;
    }

    setInterval(updateClock, 1000);
    updateClock(); // Initialer Aufruf

    // Service Worker Registration für PWA (Zwingend erforderlich für Installation)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registriert'))
            .catch(err => console.error('Service Worker Fehler:', err));
    }

    // Inline Toggle Slider Logic (Day/Week/Month)
    window.moveSlider = function(index, buttonEl) {
        // Active Klasse aktualisieren
        const buttons = document.querySelectorAll('#graph-toggles button');
        buttons.forEach(btn => btn.classList.remove('active'));
        buttonEl.classList.add('active');

        // Den weißen Hintergrund verschieben (0%, 100%, 200% seiner eigenen Breite)
        const slider = document.getElementById('toggle-slider');
        slider.style.transform = `translateX(${index * 100}%)`;
    };

    // Calendar Engine
    function renderCalendar() {
        const date = new Date();
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();
        const today = date.getDate();

        // Monate definieren (Englisch für einheitliches Design)
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('calendar-month-year').textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const daysContainer = document.getElementById('calendar-days');
        daysContainer.innerHTML = ''; // Vorherigen Inhalt leeren

        // Erster Tag des Monats (0 = Sonntag, 1 = Montag)
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        // Shift, damit die Woche am Montag beginnt (Europäischer Standard)
        const startDay = firstDay === 0 ? 6 : firstDay - 1; 

        // Wie viele Tage hat der aktuelle Monat?
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Leere Elemente einfügen, um den Start-Wochentag korrekt auszurichten
        for (let i = 0; i < startDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('calendar-day', 'empty');
            daysContainer.appendChild(emptyDiv);
        }

        // Die echten Tage generieren
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.textContent = i;
            
            // Wenn der Tag heute ist, die Highlight-Klasse geben
            if (i === today) {
                dayDiv.classList.add('today');
            }
            
            daysContainer.appendChild(dayDiv);
        }
    }

    renderCalendar();
});
