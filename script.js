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

    // --- New Container Screen Logic ---
    const homeScreen = document.getElementById('home-screen');
    const newContainerScreen = document.getElementById('new-container-screen');
    const modal = document.getElementById('data-modal');
    const blocksList = document.getElementById('blocks-list');
    
    let containerCounter = 1; // Zählt die Container für den automatischen Namen hoch
    let currentModalTarget = null; // Speichert, ob 'all' oder ein spezifischer Block (0-5) bearbeitet wird

    // Öffnet den neuen Screen
    document.getElementById('btn-new-qr').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        newContainerScreen.classList.remove('hidden');
        
        // Generiere Name, z.B. Container_001
        document.getElementById('container-name-input').value = `Container_${String(containerCounter).padStart(3, '0')}`;
        
        // Die 6 Blöcke generieren (falls noch nicht geschehen)
        if (blocksList.children.length === 0) {
            for (let i = 0; i < 6; i++) {
                const blockRow = document.createElement('div');
                blockRow.className = 'block-row';
                blockRow.innerHTML = `
                    <button class="plus-btn block-plus" onclick="openModal(${i})">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <div class="block-content" id="block-${i}">Empty Block</div>
                `;
                blocksList.appendChild(blockRow);
            }
} else {
            // Wenn man zurück und wieder rein geht, Blöcke leeren und Icons zurücksetzen
            for (let i = 0; i < 6; i++) {
                const block = document.getElementById(`block-${i}`);
                block.innerHTML = 'Empty Block';
                block.classList.remove('filled');
                
                // Setzt das Stift-Icon wieder auf das Plus-Icon zurück
                const buttonElement = block.previousElementSibling;
                if (buttonElement) {
                    buttonElement.innerHTML = '<i class="fa-solid fa-plus"></i>';
                }
            }
        }
        
        // Setze das Datum im Modal auf heute als Standard
        document.getElementById('modal-date').valueAsDate = new Date();
    });

    // Zurück zum Home Screen
    window.closeNewContainerScreen = function() {
        newContainerScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

// Modal öffnen und bei Bedarf mit bestehenden Daten füllen
    window.openModal = function(target) {
        currentModalTarget = target;
        modal.classList.remove('hidden');
        const title = document.getElementById('modal-title');
        title.textContent = target === 'all' ? 'Define All 6 Blocks' : `Define Block ${target + 1}`;

        // Logik zum Vorausfüllen der Daten
        if (target !== 'all') {
            const block = document.getElementById(`block-${target}`);
            
            // Prüfen, ob der Block bereits Daten enthält
            if (block.classList.contains('filled')) {
                // Liest alle 4 Werte aus dem HTML-Grid aus
                const dataValues = block.querySelectorAll('.data-value');
                if (dataValues.length === 4) {
                    document.getElementById('modal-type').value = dataValues[0].textContent;

                    // Datum rückwärts von DD.MM.YY nach YYYY-MM-DD konvertieren
                    const shortDate = dataValues[1].textContent;
                    const dateParts = shortDate.split('.');
                    if (dateParts.length === 3) {
                        const fullYear = `20${dateParts[2]}`; // Macht aus '26' -> '2026'
                        const formattedDate = `${fullYear}-${dateParts[1]}-${dateParts[0]}`;
                        document.getElementById('modal-date').value = formattedDate;
                    }

                    document.getElementById('modal-price').value = dataValues[2].textContent;
                    document.getElementById('modal-quality').value = dataValues[3].textContent;
                }
            } else {
                // Wenn es ein neuer, leerer Block ist: Datum auf heute setzen
                document.getElementById('modal-date').valueAsDate = new Date();
            }
        } else {
            // Wenn das globale Plus ('all') gedrückt wird: Datum auf heute setzen
            document.getElementById('modal-date').valueAsDate = new Date();
        }
    };
    // Modal schließen
    window.closeModal = function() {
        modal.classList.add('hidden');
    };

    // Daten aus dem Modal bestätigen und in die UI schreiben
    window.confirmModal = function() {
        const type = document.getElementById('modal-type').value;
     const rawDate = document.getElementById('modal-date').value;
        const price = document.getElementById('modal-price').value;
        const quality = document.getElementById('modal-quality').value;

        // Datum von YYYY-MM-DD in DD.MM.YY umwandeln für maximalen Platz
        let shortDate = "";
        if (rawDate) {
            const parts = rawDate.split('-');
            shortDate = `${parts[2]}.${parts[1]}.${parts[0].substring(2)}`;
        }

        // Die formatierte Ausgabe als sauberes UI-Grid
        const contentString = `
            <div class="block-data-grid">
                <div class="data-item">
                    <span class="data-label">Type</span>
                    <span class="data-value">${type}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Date</span>
                    <span class="data-value">${shortDate}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Price</span>
                    <span class="data-value">${price}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Quality</span>
                    <span class="data-value">${quality}</span>
                </div>
            </div>
        `;
        if (currentModalTarget === 'all') {
            // Alle 6 Blöcke füllen
            for (let i = 0; i < 6; i++) {
                updateBlock(i, contentString);
            }
        } else {
            // Nur den einen spezifischen Block füllen
            updateBlock(currentModalTarget, contentString);
        }

        closeModal();
    };

  // Hilfsfunktion zum Updaten des HTML eines Blocks und des Icons
    function updateBlock(index, htmlString) {
        const block = document.getElementById(`block-${index}`);
        block.innerHTML = htmlString;
        block.classList.add('filled');

        // Greift auf den Button links neben dem Block zu und ändert das Icon von Plus zu Stift
        const buttonElement = block.previousElementSibling;
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="fa-solid fa-pen"></i>';
        }
    }
});
