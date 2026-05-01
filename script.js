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

   // --- New Container Screen Logic (Master & Child) ---
    const homeScreen = document.getElementById('home-screen');
    const newContainerScreen = document.getElementById('new-container-screen');
    const cardSlider = document.getElementById('card-slider');
    const currentViewTitle = document.getElementById('current-view-title');
    
    // Master State (Container) & Child States (Blöcke)
    let masterState = { id: '', name: 'Container_001', qrDesign: 'squares', format: '', blocks: 0, quality: '', date: '' };
    let childStates = []; // Array of objects
    let currentActiveIndex = -1; // -1 = Container, 0-9 = Blöcke

    // Hilfsfunktion: ID generieren (falls noch nicht in Database Logic definiert)
    function generateUUID(prefix) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let res = prefix + '-';
        for (let i=0; i<6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    }

    // Öffnen des Screens
    document.getElementById('btn-new-qr').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        newContainerScreen.classList.remove('hidden');
        
        // Initialer Reset
        masterState = { 
            id: generateUUID('C'), 
            name: 'Container_001', 
            qrDesign: 'squares', 
            format: '', 
            blocks: 0, 
            quality: '', 
            date: new Date().toISOString().split('T')[0] 
        };
        childStates = [];
        currentActiveIndex = -1;
        
        document.getElementById('v2-name').value = masterState.name;
        document.getElementById('v2-date').value = masterState.date;
        resetToggles();
        renderCards();
    });

    window.closeNewContainerScreen = function() {
        newContainerScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

    // --- UI Event Listeners für Eingaben ---
    
    // Name Input
    document.getElementById('v2-name').addEventListener('input', (e) => {
        if(currentActiveIndex === -1) masterState.name = e.target.value;
        // Name-Änderung in Blöcken ignorieren wir in der Logik, da Name = ContainerName
        renderCards();
    });

    // Date Input
    document.getElementById('v2-date').addEventListener('input', (e) => {
        updateState('date', e.target.value);
    });

    // Generische Toggle Logic für Buttons
    document.querySelectorAll('.toggle-row button, .blocks-grid button').forEach(btn => {
        btn.addEventListener('click', function() {
            const val = this.getAttribute('data-val');
            const parentId = this.parentElement.id;
            
            // UI Update (Active Class)
            if(parentId !== 'v2-blocks') {
                this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }

            // Logic Routing
            if (parentId === 'v2-qr-design') updateState('qrDesign', val);
            if (parentId === 'v2-format') {
                updateState('format', val);
                // Smart-Default: A5 = 5 Blöcke, A6 = 5 Blöcke (anpassbar)
                if (currentActiveIndex === -1 && masterState.blocks === 0) {
                    updateBlocksCount(5);
                }
            }
            if (parentId === 'v2-blocks') {
                // Blocks können nur im Container-Modus geändert werden
                if (currentActiveIndex === -1) updateBlocksCount(parseInt(val));
            }
            if (parentId === 'v2-quality') updateState('quality', val);
        });
    });

    function updateState(key, value) {
        if (currentActiveIndex === -1) {
            // Master Update: Ändert Container und löscht individuelle Child-Overrides
            masterState[key] = value;
            childStates.forEach(child => child[key] = null);
        } else {
            // Child Update: Überschreibt nur diesen spezifischen Block
            childStates[currentActiveIndex][key] = value;
        }
        renderCards();
    }

    function updateBlocksCount(count) {
        masterState.blocks = count;
        // UI für Blocks updaten
        document.querySelectorAll('#v2-blocks button').forEach(b => {
            if (parseInt(b.getAttribute('data-val')) <= count) b.classList.add('active');
            else b.classList.remove('active');
        });

        // Child States anpassen
        while (childStates.length < count) {
            childStates.push({ id: generateUUID('B'), format: null, quality: null, date: null });
        }
        if (childStates.length > count) {
            childStates.length = count; // Kürzen
        }
        renderCards();
    }

    function resetToggles() {
        document.querySelectorAll('.toggle-row button, .blocks-grid button').forEach(b => b.classList.remove('active'));
        document.querySelector('#v2-qr-design button[data-val="squares"]').classList.add('active');
    }

    // --- Rendering der Live Cards ---
    
    // Aggregations-Funktion (Sammelt z.B. High / Low)
    function getAggregated(key) {
        let values = new Set();
        if (masterState[key]) values.add(masterState[key]);
        childStates.forEach(child => {
            if (child[key]) values.add(child[key]);
        });
        return Array.from(values).join(' / ') || '-';
    }

    function renderCards() {
        cardSlider.innerHTML = '';
        
        // 1. Container Card rendern
        const cCard = document.createElement('div');
        cCard.className = 'live-card';
        cCard.innerHTML = `
            <div class="card-info">
                <div class="card-title">${masterState.name || 'Unnamed Container'}</div>
                <div class="card-detail">Format: ${getAggregated('format')}</div>
                <div class="card-detail">Quality: ${getAggregated('quality')}</div>
                <div class="card-detail">Date: ${getAggregated('date')}</div>
            </div>
            <div class="card-qr-box" id="qr-render-c"></div>
        `;
        cardSlider.appendChild(cCard);

        // 2. Block Cards rendern
        childStates.forEach((child, index) => {
            const bCard = document.createElement('div');
            bCard.className = 'live-card card-blue';
            bCard.innerHTML = `
                <div class="card-info">
                    <div class="card-title">Block ${index + 1}</div>
                    <div class="card-detail">Format: ${child.format || masterState.format || '-'}</div>
                    <div class="card-detail">Quality: ${child.quality || masterState.quality || '-'}</div>
                    <div class="card-detail">Date: ${child.date || masterState.date || '-'}</div>
                </div>
                <div class="card-qr-box" id="qr-render-b${index}"></div>
            `;
            cardSlider.appendChild(bCard);
        });

        // 3. QR Codes generieren (Nur die statischen IDs)
        new QRCode(document.getElementById('qr-render-c'), {
            text: masterState.id, width: 60, height: 60, colorDark: "#000000", colorLight: "#ffffff"
        });
        
        childStates.forEach((child, index) => {
            new QRCode(document.getElementById(`qr-render-b${index}`), {
                // Blaue QR Codes für die Blöcke
                text: child.id, width: 60, height: 60, colorDark: "#0055ff", colorLight: "#ffffff"
            });
        });
    }

    // --- Swipe Detection Logic ---
    cardSlider.addEventListener('scroll', () => {
        const scrollX = cardSlider.scrollLeft;
        const cardWidth = cardSlider.clientWidth;
        
        // Berechnet, welche Karte aktuell im Fokus ist (-1 = Container, 0+ = Block)
        const index = Math.round(scrollX / cardWidth) - 1;
        
        if (currentActiveIndex !== index) {
            currentActiveIndex = index;
            updateUIFromScroll(index);
        }
    });

    function updateUIFromScroll(index) {
        // Titel anpassen
        if (index === -1) {
            currentViewTitle.textContent = 'CONTAINER';
            currentViewTitle.style.color = '#888';
            syncInputsWithState(masterState);
        } else {
            currentViewTitle.textContent = `BLOCK ${index + 1}`;
            currentViewTitle.style.color = '#0055ff'; // Blau für Blöcke
            // Sync mit spezifischem Block oder Fallback auf Master
            const child = childStates[index];
            syncInputsWithState({
                format: child.format || masterState.format,
                quality: child.quality || masterState.quality,
                date: child.date || masterState.date
            });
        }
    }

    function syncInputsWithState(stateObj) {
        document.querySelectorAll('#v2-format button, #v2-quality button').forEach(b => b.classList.remove('active'));
        if (stateObj.format) {
            const btn = document.querySelector(`#v2-format button[data-val="${stateObj.format}"]`);
            if (btn) btn.classList.add('active');
        }
        if (stateObj.quality) {
            const btn = document.querySelector(`#v2-quality button[data-val="${stateObj.quality}"]`);
            if (btn) btn.classList.add('active');
        }
        if (stateObj.date) {
            document.getElementById('v2-date').value = stateObj.date;
        }
    }
    // --- Database & ID Generation Logic ---
    const listScreen = document.getElementById('list-screen');
    const qrListContent = document.getElementById('qr-list-content');

    // Generiert z.B. "C-9A4F" oder "B-2X8K"
    function generateID(prefix) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix + '-';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Lädt die lokale Datenbank (falls vorhanden) oder erstellt eine leere
    function loadDatabase() {
        const data = localStorage.getItem('paperlogistics_db');
        return data ? JSON.parse(data) : { containers: [] };
    }

    // Speichert die lokale Datenbank
    function saveDatabase(db) {
        localStorage.setItem('paperlogistics_db', JSON.stringify(db));
    }

    // --- Create Button Logic ---
    document.querySelector('.btn-create').addEventListener('click', () => {
        const containerName = document.getElementById('container-name-input').value;
        const containerID = generateID('C');
        const creationDate = new Date().toLocaleDateString('de-DE'); // Heutiges Datum formatieren
        
        const containerData = {
            id: containerID,
            name: containerName,
            date: creationDate,
            blocks: []
        };

        // Blöcke auslesen
        for (let i = 0; i < 6; i++) {
            const block = document.getElementById(`block-${i}`);
            if (block.classList.contains('filled')) {
                const dataValues = block.querySelectorAll('.data-value');
                if (dataValues.length === 4) {
                    containerData.blocks.push({
                        id: generateID('B'),
                        type: dataValues[0].textContent,
                        date: dataValues[1].textContent,
                        price: dataValues[2].textContent,
                        quality: dataValues[3].textContent,
                        status: 'available'
                    });
                }
            }
        }

        // In lokale Datenbank speichern
        const db = loadDatabase();
        db.containers.unshift(containerData); // unshift packt es ganz nach oben in die Liste
        saveDatabase(db);

        // Screens wechseln
        newContainerScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
        
        // Liste aktualisieren
        renderListScreen();
    });

    // --- List Screen Navigation ---
    document.getElementById('btn-list').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
        renderListScreen();
    });

    window.closeListScreen = function() {
        listScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

    // --- List Rendering & QR Generation ---
    function renderListScreen() {
        qrListContent.innerHTML = ''; // Liste leeren
        const db = loadDatabase();

        db.containers.forEach((container, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            
            // Linke Seite: Infos
            const infoDiv = document.createElement('div');
            infoDiv.className = 'list-item-info';
            infoDiv.innerHTML = `
                <span class="list-item-title">${container.name}</span>
                <span class="list-item-date">${container.date} &bull; ${container.blocks.length} Blocks</span>
            `;
            
            // Rechte Seite: QR Code Container
            const qrDiv = document.createElement('div');
            qrDiv.className = 'qr-code-display';
            qrDiv.id = `qr-code-${index}`;

            listItem.appendChild(infoDiv);
            listItem.appendChild(qrDiv);
            qrListContent.appendChild(listItem);

            // Generiert den echten QR-Code basierend auf der Container-ID
            new QRCode(document.getElementById(`qr-code-${index}`), {
                text: container.id,
                width: 60,
                height: 60,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.L
            });
        });

        // Wenn die Datenbank leer ist
        if (db.containers.length === 0) {
            qrListContent.innerHTML = '<p style="color: #666; text-align: center; margin-top: 20px;">No Containers created yet.</p>';
        }
    }
});
