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
    
    // Master State (Container) & Child States (Blöcke) - QR Design entfernt, Price hinzugefügt
    let masterState = { id: '', name: 'Container_001', format: '', blocks: 0, price: '', quality: '', date: '' };
    let childStates = []; 
    let currentActiveIndex = -1; 

    function generateUUID(prefix) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let res = prefix + '-';
        for (let i=0; i<6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    }

// Hilfsfunktion: Berechnet den nächsten freien Container-Namen
    function getNextContainerName() {
        const db = loadDatabase();
        let maxNumber = 0;
        
        db.containers.forEach(c => {
            // Sucht nach dem Muster "Container_XXX" (ignoriert manuell völlig anders benannte Container)
            const match = c.name.match(/^Container_(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNumber) maxNumber = num;
            }
        });
        
        return `Container_${String(maxNumber + 1).padStart(3, '0')}`;
    }
    
// Öffnen des Screens (NEU ERSTELLEN)
    document.getElementById('btn-new-qr').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        newContainerScreen.classList.remove('hidden');
        
        isEditMode = false; // WICHTIG: Hier gehört der Reset-Schalter hin!
        
        masterState = { 
            id: generateUUID('C'), 
            name: getNextContainerName(), 
            format: '', 
            blocks: 0, 
            price: '', 
            quality: '', 
            date: new Date().toISOString().split('T')[0] 
        };
        childStates = [];
        currentActiveIndex = -1;
        
        document.getElementById('v2-name').value = masterState.name;
        document.getElementById('v2-date').value = masterState.date;
        
        resetToggles();
        renderCards();
        
        // Zwingt die UI in den weißen Container-Modus und spult den Slider zurück
        updateUIFromScroll(-1);
        document.getElementById('card-slider').scrollLeft = 0;
    });

window.closeNewContainerScreen = function() {
        newContainerScreen.classList.add('hidden');
        if (isEditMode) {
            // Wenn wir beim Bearbeiten abbrechen, zurück zu den Details (Änderungen verwerfen)
            detailScreen.classList.remove('hidden'); 
        } else {
            // Wenn wir beim Neu anlegen abbrechen, zurück zum Home-Screen
            homeScreen.classList.remove('hidden'); 
        }
    };

    // --- UI Event Listeners für Eingaben ---
    document.getElementById('v2-name').addEventListener('input', (e) => {
        if(currentActiveIndex === -1) {
            masterState.name = e.target.value;
        } else {
            childStates[currentActiveIndex].name = e.target.value;
        }
        renderCards();
    });

    document.getElementById('v2-date').addEventListener('input', (e) => {
        updateState('date', e.target.value);
    });

    document.querySelectorAll('.toggle-row button, .blocks-grid button').forEach(btn => {
        btn.addEventListener('click', function() {
            const val = this.getAttribute('data-val');
            const parentId = this.parentElement.id;
            
            if(parentId !== 'v2-blocks') {
                this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }

            if (parentId === 'v2-format') {
                updateState('format', val);
                if (currentActiveIndex === -1 && masterState.blocks === 0) updateBlocksCount(5);
            }
            if (parentId === 'v2-blocks') {
                if (currentActiveIndex === -1) updateBlocksCount(parseInt(val));
            }
            if (parentId === 'v2-price') updateState('price', val);
            if (parentId === 'v2-quality') updateState('quality', val);
        });
    });

    function updateState(key, value) {
        if (currentActiveIndex === -1) {
            masterState[key] = value;
            childStates.forEach(child => child[key] = null);
        } else {
            childStates[currentActiveIndex][key] = value;
        }
        renderCards();
    }

    function updateBlocksCount(count) {
        masterState.blocks = count;
        document.querySelectorAll('#v2-blocks button').forEach(b => {
            if (parseInt(b.getAttribute('data-val')) <= count) b.classList.add('active');
            else b.classList.remove('active');
        });

        while (childStates.length < count) {
            childStates.push({ 
                id: generateUUID('B'), 
                name: `Block_${childStates.length + 1}`,
                format: null, 
                price: null,
                quality: null, 
                date: null 
            });
        }
        if (childStates.length > count) childStates.length = count; 
        renderCards();
    }

    function resetToggles() {
        document.querySelectorAll('.toggle-row button, .blocks-grid button').forEach(b => b.classList.remove('active'));
    }

    // --- Rendering der Live Cards ---
    function getAggregated(key) {
        let values = new Set();
        if (masterState[key]) values.add(masterState[key]);
        childStates.forEach(child => {
            if (child[key]) values.add(child[key]);
        });
        return Array.from(values).join(' / ') || '-';
    }

    // Klassisches QR Design (nur Quadrate, Farben bleiben erhalten)
    function getQRConfig(isBlock = false) {
        const color = isBlock ? "#0055ff" : "#000000"; 
        return {
            width: 85,
            height: 85,
            dotsOptions: { color: color, type: "square" },
            cornersSquareOptions: { color: color, type: "square" },
            cornersDotOptions: { color: color, type: "square" },
            backgroundOptions: { color: "transparent" } 
        };
    }

    function renderCards() {
        cardSlider.innerHTML = '';
        
        const cCard = document.createElement('div');
        cCard.className = 'live-card';
        cCard.innerHTML = `
            <div class="card-info">
                <div class="card-title">${masterState.name || 'Unnamed Container'}</div>
                <div class="card-detail">Format: ${getAggregated('format')}</div>
                <div class="card-detail">Price: ${getAggregated('price')}</div>
                <div class="card-detail">Quality: ${getAggregated('quality')}</div>
                <div class="card-detail">Date: ${getAggregated('date')}</div>
            </div>
            <div class="card-qr-box" id="qr-render-c"></div>
        `;
        cardSlider.appendChild(cCard);

        childStates.forEach((child, index) => {
            const bCard = document.createElement('div');
            bCard.className = 'live-card card-blue';
            bCard.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${child.name}</div>
                    <div class="card-detail">Format: ${child.format || masterState.format || '-'}</div>
                    <div class="card-detail">Price: ${child.price || masterState.price || '-'}</div>
                    <div class="card-detail">Quality: ${child.quality || masterState.quality || '-'}</div>
                    <div class="card-detail">Date: ${child.date || masterState.date || '-'}</div>
                </div>
                <div class="card-qr-box" id="qr-render-b${index}"></div>
            `;
            cardSlider.appendChild(bCard);
        });

        const containerConfig = getQRConfig(false);
        containerConfig.data = masterState.id;
        new QRCodeStyling(containerConfig).append(document.getElementById('qr-render-c'));
        
        childStates.forEach((child, index) => {
            const blockConfig = getQRConfig(true); 
            blockConfig.data = child.id;
            new QRCodeStyling(blockConfig).append(document.getElementById(`qr-render-b${index}`));
        });
    }

    // --- Swipe Detection Logic ---
    cardSlider.addEventListener('scroll', () => {
        const scrollX = cardSlider.scrollLeft;
        const cardWidth = cardSlider.clientWidth;
        const index = Math.round(scrollX / cardWidth) - 1;
        
        if (currentActiveIndex !== index) {
            currentActiveIndex = index;
            updateUIFromScroll(index);
        }
    });

    function updateUIFromScroll(index) {
        const editorSection = document.querySelector('.editor-section');
        
        if (index === -1) {
            currentViewTitle.textContent = 'CONTAINER';
            currentViewTitle.style.color = '#888';
            document.getElementById('v2-name').value = masterState.name;
            editorSection.classList.remove('block-mode'); 
            syncInputsWithState(masterState);
        } else {
            currentViewTitle.textContent = 'BLOCK';
            currentViewTitle.style.color = '#0055ff'; 
            document.getElementById('v2-name').value = childStates[index].name; 
            editorSection.classList.add('block-mode'); 
            
            const child = childStates[index];
            syncInputsWithState({
                format: child.format || masterState.format,
                price: child.price || masterState.price,
                quality: child.quality || masterState.quality,
                date: child.date || masterState.date
            });
        }
    }

    function syncInputsWithState(stateObj) {
        document.querySelectorAll('#v2-format button, #v2-price button, #v2-quality button').forEach(b => b.classList.remove('active'));
        if (stateObj.format) {
            const btn = document.querySelector(`#v2-format button[data-val="${stateObj.format}"]`);
            if (btn) btn.classList.add('active');
        }
        if (stateObj.price) {
            const btn = document.querySelector(`#v2-price button[data-val="${stateObj.price}"]`);
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
    const detailScreen = document.getElementById('detail-screen');
    const detailCardContainer = document.getElementById('detail-card-container');
    const detailHistoryList = document.getElementById('detail-history-list');



    // Lädt die lokale Datenbank (falls vorhanden) oder erstellt eine leere
    function loadDatabase() {
        const data = localStorage.getItem('paperlogistics_db');
        return data ? JSON.parse(data) : { containers: [] };
    }

    // Speichert die lokale Datenbank
    function saveDatabase(db) {
        localStorage.setItem('paperlogistics_db', JSON.stringify(db));
    }

// --- Database & Confirm Button Logic (V2) ---
    document.getElementById('btn-confirm-v2').addEventListener('click', () => {
        const db = loadDatabase();

        // Namens-Check: Ignoriert beim Editieren den Namen des aktuellen Containers
        const nameExists = db.containers.some((c, index) => {
            if (isEditMode && index === currentDetailIndex) return false; 
            return c.name.trim().toLowerCase() === masterState.name.trim().toLowerCase();
        });
        
        if (nameExists) {
            alert(`Der Name "${masterState.name}" wird bereits verwendet. Bitte wähle einen eindeutigen Namen.`);
            return;
        }

        // Aktuelles Datum + exakte Uhrzeit für die Historie generieren
        const now = new Date();
        const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const containerData = {
            id: masterState.id,
            name: masterState.name,
            date: masterState.date,
            format: masterState.format,
            price: masterState.price,
            quality: masterState.quality,
            blocks: [],
            history: [] // Das neue Array für den Audit-Trail
        };

        childStates.forEach(child => {
            containerData.blocks.push({
                id: child.id,
                name: child.name, 
                format: child.format || masterState.format,
                price: child.price || masterState.price,
                quality: child.quality || masterState.quality,
                date: child.date || masterState.date,
                status: child.status || 'available' 
            });
        });

        if (isEditMode) {
            // Alte Historie übernehmen (oder Fallback erstellen, falls es ein alter Container ist)
            const oldContainer = db.containers[currentDetailIndex];
            containerData.history = oldContainer.history || [{
                icon: 'fa-plus',
                text: 'Container Created',
                time: oldContainer.date || timeString
            }];

            // Neuen "Bearbeitet" Eintrag hinzufügen
            containerData.history.push({
                icon: 'fa-pen',
                text: 'Daten aktualisiert',
                time: timeString
            });

            // Überschreiben und speichern
            db.containers[currentDetailIndex] = containerData;
            saveDatabase(db);
            
            newContainerScreen.classList.add('hidden');
            detailScreen.classList.remove('hidden');
            openDetailScreen(currentDetailIndex); 
        } else {
            // Bei Neu-Erstellung den initialen Historien-Eintrag setzen
            containerData.history.push({
                icon: 'fa-plus',
                text: 'Container Created',
                time: timeString
            });

            db.containers.unshift(containerData); 
            saveDatabase(db);
            
            newContainerScreen.classList.add('hidden');
            listScreen.classList.remove('hidden');
        }
        
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
        qrListContent.innerHTML = ''; 
        const db = loadDatabase();

        db.containers.forEach((container, index) => {
            // Wir bauen die Aggregations-Logik (z.B. "High / Low") für die Liste nach
            function getListAggregated(key) {
                let values = new Set();
                if (container[key]) values.add(container[key]);
                if (container.blocks) {
                    container.blocks.forEach(block => {
                        if (block[key]) values.add(block[key]);
                    });
                }
                return Array.from(values).join(' / ') || '-';
            }

            // Datum formatieren
            let displayDate = container.date;
            if (displayDate && displayDate.includes('-')) {
                const parts = displayDate.split('-');
                displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
            }

const listItem = document.createElement('div');
            listItem.className = 'live-card'; 
            listItem.style.cursor = 'pointer'; // Zeigt an, dass es klickbar ist
            
            // Öffnet den Detail-Screen und übergibt den Index
            listItem.addEventListener('click', () => {
                openDetailScreen(index);
            });
            
            listItem.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${container.name}</div>
                    <div class="card-detail">Format: ${getListAggregated('format')}</div>
                    <div class="card-detail">Price: ${getListAggregated('price')}</div>
                    <div class="card-detail">Quality: ${getListAggregated('quality')}</div>
                    <div class="card-detail">Date: ${displayDate}</div>
                </div>
                <div class="card-qr-box" id="qr-code-${index}"></div>
            `;
            
            qrListContent.appendChild(listItem);

            // Generiert den Premium-QR-Code in der exakt gleichen Größe wie im Editor (85x85)
            const listQRConfig = getQRConfig(false);
            listQRConfig.data = container.id;
            listQRConfig.width = 85; 
            listQRConfig.height = 85;
            
            new QRCodeStyling(listQRConfig).append(document.getElementById(`qr-code-${index}`));
        });

        if (db.containers.length === 0) {
            qrListContent.innerHTML = '<p style="color: #666; text-align: center; margin-top: 20px;">No Containers created yet.</p>';
        }
    }
// --- Detail Screen & Edit Logic ---
    let currentDetailIndex = -1;
    let isEditMode = false;

    window.openDetailScreen = function(containerIndex) {
        currentDetailIndex = containerIndex;
        const db = loadDatabase();
        const container = db.containers[containerIndex];
        
        if (!container) return;

        // 1. Screens wechseln
        listScreen.classList.add('hidden');
        detailScreen.classList.remove('hidden');

        // Aggregations-Logik für die Card (Wiederverwendung)
        function getDetailAggregated(key) {
            let values = new Set();
            if (container[key]) values.add(container[key]);
            if (container.blocks) {
                container.blocks.forEach(block => {
                    if (block[key]) values.add(block[key]);
                });
            }
            return Array.from(values).join(' / ') || '-';
        }

        // Datum formatieren
        let displayDate = container.date;
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }

        // 2. Die 1:1 Live-Card in den Detail-Screen kopieren
        detailCardContainer.innerHTML = `
            <div class="live-card">
                <div class="card-info">
                    <div class="card-title">${container.name}</div>
                    <div class="card-detail">Format: ${getDetailAggregated('format')}</div>
                    <div class="card-detail">Price: ${getDetailAggregated('price')}</div>
                    <div class="card-detail">Quality: ${getDetailAggregated('quality')}</div>
                    <div class="card-detail">Date: ${displayDate}</div>
                </div>
                <div class="card-qr-box" id="qr-detail-c"></div>
            </div>
        `;

        // QR Code im Detail-Screen generieren
        const detailQRConfig = getQRConfig(false);
        detailQRConfig.data = container.id;
        detailQRConfig.width = 85; 
        detailQRConfig.height = 85;
        new QRCodeStyling(detailQRConfig).append(document.getElementById('qr-detail-c'));

  // 3. Echte Historie aus der Datenbank rendern
        detailHistoryList.innerHTML = '';
        
        // Fallback für alte Container, die noch kein History-Array haben
        const historyData = container.history || [{
            icon: 'fa-plus',
            text: 'Container Created',
            time: displayDate
        }];

        // Wir drehen das Array um (.slice().reverse()), damit die neueste Aktion immer oben steht
        historyData.slice().reverse().forEach(entry => {
            detailHistoryList.innerHTML += `
                <div class="history-item">
                    <div class="history-icon"><i class="fa-solid ${entry.icon}"></i></div>
                    <div class="history-info">
                        <span class="history-text">${entry.text}</span>
                        <span class="history-date">${entry.time}</span>
                    </div>
                </div>
            `;
        });
    };

    window.closeDetailScreen = function() {
        detailScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
    };
    // --- Edit & Delete Actions ---
    const deletePopup = document.getElementById('delete-popup');

    // BEARBEITEN: Läd die Daten in den Editor
    document.getElementById('btn-edit-container').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        if (!container) return;

        isEditMode = true;

        // MasterState mit den existierenden Daten füllen
        masterState = {
            id: container.id,
            name: container.name,
            format: container.format || '',
            blocks: container.blocks ? container.blocks.length : 0,
            price: container.price || '',
            quality: container.quality || '',
            date: container.date || ''
        };

        // ChildStates mit den existierenden Blöcken füllen
        childStates = [];
        if (container.blocks) {
            container.blocks.forEach(b => {
                childStates.push({
                    id: b.id,
                    name: b.name,
                    format: b.format,
                    price: b.price,
                    quality: b.quality,
                    date: b.date,
                    status: b.status || 'available'
                });
            });
        }

currentActiveIndex = -1; // Startet wieder auf der Master-Card
        document.getElementById('v2-name').value = masterState.name;
        document.getElementById('v2-date').value = masterState.date;
        
        resetToggles();
        
        // Block-Anzahl visuell wiederherstellen
        document.querySelectorAll('#v2-blocks button').forEach(b => {
            if (parseInt(b.getAttribute('data-val')) <= masterState.blocks) {
                b.classList.add('active');
            }
        });

        renderCards();
        
        // Zwingt die UI dazu, alle gespeicherten Toggles (Format, Price, Quality) farblich zu markieren
        updateUIFromScroll(-1);
        
        // Setzt den physischen Wisch-Slider wieder ganz nach links auf Anfang
        document.getElementById('card-slider').scrollLeft = 0;

        // Screen Wechsel
        detailScreen.classList.add('hidden');
        newContainerScreen.classList.remove('hidden');
    });

    // LÖSCHEN POPUP ÖFFNEN
    document.getElementById('btn-delete-container').addEventListener('click', () => {
        deletePopup.classList.remove('hidden');
    });

    // LÖSCHEN ABBRECHEN (No)
    document.getElementById('btn-popup-no').addEventListener('click', () => {
        deletePopup.classList.add('hidden');
    });

    // LÖSCHEN BESTÄTIGEN (Yes)
    document.getElementById('btn-popup-yes').addEventListener('click', () => {
        const db = loadDatabase();
        // Schneidet exakt diesen einen Container aus dem Array heraus
        db.containers.splice(currentDetailIndex, 1);
        saveDatabase(db);

        deletePopup.classList.add('hidden');
        detailScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
        
        renderListScreen(); // Liste ohne den gelöschten Container neu zeichnen
    });

// --- Scanner Logic (ZXing Engine) ---
    const scanScreen = document.getElementById('scan-screen');
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let isScanning = false;

    // Hilfsfunktion: Hardware-Kamera physisch vom Video-Element trennen
    async function stopScanner() {
        // 1. ZXing Loop stoppen
        codeReader.reset();
        
        // 2. Hardware-Kill-Switch für den Video-Stream
        const videoEl = document.getElementById('video-preview');
        if (videoEl && videoEl.srcObject) {
            const stream = videoEl.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop()); // Tötet die Kamera auf Systemebene
            videoEl.srcObject = null;
        }
    }

// Öffnet den Scanner
    document.getElementById('btn-scan-qr').addEventListener('click', async () => {
        if (isScanning) return; // Guard
        isScanning = true;

        homeScreen.classList.add('hidden');
        scanScreen.classList.remove('hidden');

        // WICHTIG für iOS: Zwingt Apple, das Video nicht im Vollbild-Player zu öffnen
        document.getElementById('video-preview').setAttribute('playsinline', 'true');

        try {
            // Der harte OS-Befehl: Zwingt das Gerät zur Rückkamera ("environment"), ohne auf Namen zu achten
            const constraints = {
                video: { facingMode: "environment" }
            };

            // Startet den Scan-Loop direkt mit dem Hardware-Zwang
            codeReader.decodeFromConstraints(constraints, 'video-preview', async (result, err) => {
                if (result) {
                    // TREFFER!
                    if (!isScanning) return; // Doppel-Scan Guard
                    isScanning = false;
                    
                    // 1. Hardware-Kill sofort auslösen
                    await stopScanner();
                    
                    // 2. Feedback (Vibration)
                    if (navigator.vibrate) navigator.vibrate(50);
                    
                    // 3. Auswertung
                    const decodedText = result.getText();
                    scanScreen.classList.add('hidden');
                    
                    const db = loadDatabase();
                    let targetContainerIndex = -1;

                    targetContainerIndex = db.containers.findIndex(c => c.id === decodedText);

                    if (targetContainerIndex === -1) {
                        for (let i = 0; i < db.containers.length; i++) {
                            const container = db.containers[i];
                            if (container.blocks && container.blocks.some(b => b.id === decodedText)) {
                                targetContainerIndex = i;
                                break;
                            }
                        }
                    }

                    // 4. Navigation
                    if (targetContainerIndex !== -1) {
                        openDetailScreen(targetContainerIndex);
                    } else {
                        alert(`QR-Code (${decodedText}) gehört zu keinem Container im System.`);
                        homeScreen.classList.remove('hidden');
                    }
                }
                
                // Ignoriert harmlose Fehler (wenn im aktuellen Frame kein Code gefunden wurde)
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.warn("ZXing Reader Error:", err);
                }
            });

        } catch (err) {
            console.error("Kamera-Fehler:", err);
            alert("Kamera konnte nicht gestartet werden. Bitte erlaube den Zugriff.");
            await stopScanner();
            isScanning = false;
            scanScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        }
    });

    // Schließt den Scanner manuell (Back Button)
    window.closeScanScreen = async function() {
        isScanning = false;
        await stopScanner();
        scanScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };
});
