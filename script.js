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



// --- DASHBOARD CHART ENGINE ---
    let salesChartInstance = null;

    window.updateDashboardChart = function(timeframeIndex) {
        const db = loadDatabase();
        // Filtere nur echte Verkäufe (Einträge mit Payload)
        const sales = (db.globalHistory || []).filter(entry => entry.payload);

        let labels = [];
        let dataValues = [];
        const now = new Date();

        // Hilfsfunktion: Zeitstring "DD.MM.YYYY HH:MM" in echtes Datum umwandeln
        function parseCustomDate(timeStr) {
            const [datePart] = timeStr.split(' ');
            const [d, m, y] = datePart.split('.');
            return new Date(y, m - 1, d);
        }

        if (timeframeIndex === 0) {
            // MODUS 'DAY': Letzte 7 Tage
            labels = [...Array(7)].map((_, i) => {
                const d = new Date(now);
                d.setDate(d.getDate() - (6 - i));
                return d.toLocaleDateString('en-US', { weekday: 'short' });
            });
            dataValues = Array(7).fill(0);
            
            sales.forEach(sale => {
                const saleDate = parseCustomDate(sale.time);
                for(let i=0; i<7; i++) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (6 - i));
                    if (saleDate.getDate() === d.getDate() && saleDate.getMonth() === d.getMonth() && saleDate.getFullYear() === d.getFullYear()) {
                        dataValues[i] += sale.payload.blocks.length;
                    }
                }
            });

        } else if (timeframeIndex === 1) {
            // MODUS 'WEEK': Letzte 4 Wochen
            labels = ['Week -3', 'Week -2', 'Last Wk', 'This Wk'];
            dataValues = Array(4).fill(0);
            
            sales.forEach(sale => {
                const saleDate = parseCustomDate(sale.time);
                const diffTime = now - saleDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 7) dataValues[3] += sale.payload.blocks.length;
                else if (diffDays <= 14) dataValues[2] += sale.payload.blocks.length;
                else if (diffDays <= 21) dataValues[1] += sale.payload.blocks.length;
                else if (diffDays <= 28) dataValues[0] += sale.payload.blocks.length;
            });

        } else {
            // MODUS 'ALL': Dynamische Skalierung ab dem allerersten Verkauf
            if (sales.length === 0) {
                // Fallback: 6 Monate, wenn noch nichts verkauft wurde
                labels = [...Array(6)].map((_, i) => {
                    const d = new Date(now);
                    d.setMonth(d.getMonth() - (5 - i));
                    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                });
                dataValues = Array(6).fill(0);
            } else {
                // Ersten Verkauf finden (Die Datenbank speichert chronologisch)
                const earliestSaleDate = parseCustomDate(sales[0].time);
                
                // Berechne die Spanne in Monaten zwischen dem ersten Verkauf und heute
                let monthsDiff = (now.getFullYear() - earliestSaleDate.getFullYear()) * 12;
                monthsDiff -= earliestSaleDate.getMonth();
                monthsDiff += now.getMonth();
                monthsDiff = Math.max(monthsDiff + 1, 6); // Zeige der Optik halber immer mindestens 6 Monate

                labels = [...Array(monthsDiff)].map((_, i) => {
                    const d = new Date(now);
                    d.setMonth(d.getMonth() - (monthsDiff - 1 - i));
                    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                });
                dataValues = Array(monthsDiff).fill(0);
                
                sales.forEach(sale => {
                    const saleDate = parseCustomDate(sale.time);
                    for(let i=0; i<monthsDiff; i++) {
                        const d = new Date(now);
                        d.setMonth(d.getMonth() - (monthsDiff - 1 - i));
                        if (saleDate.getMonth() === d.getMonth() && saleDate.getFullYear() === d.getFullYear()) {
                            dataValues[i] += sale.payload.blocks.length;
                        }
                    }
                });
            }
        }

        const ctx = document.getElementById('dashboard-sales-chart').getContext('2d');
        if (salesChartInstance) salesChartInstance.destroy();

        salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Blocks Sold',
                    data: dataValues,
                    borderColor: '#0055ff',
                    backgroundColor: 'rgba(0, 85, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0055ff',
                    pointBorderColor: '#111',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#888' }, grid: { display: false } }
                }
            }
        });
    };

    // --- Custom Dropdown Logic ---
    window.toggleChartDropdown = function(e) {
        e.stopPropagation(); // Verhindert, dass der Klick ans Dokument weitergeleitet wird
        document.getElementById('dropdown-options-list').classList.toggle('hidden');
    };

    window.selectChartTimeframe = function(index, text, e) {
        e.stopPropagation();
        document.getElementById('dropdown-current-value').textContent = text;
        document.getElementById('dropdown-options-list').classList.add('hidden');
        updateDashboardChart(index); // Chart neu berechnen und zeichnen
    };

    // Schließt das Dropdown, wenn man irgendwo anders auf den Bildschirm tippt
    document.addEventListener('click', () => {
        const dropdown = document.getElementById('dropdown-options-list');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });

    // Lädt das Diagramm automatisch beim ersten App-Start
    setTimeout(() => {
        if(document.getElementById('dashboard-sales-chart')) updateDashboardChart(0);
    }, 500);

    // Inline Toggle Slider Logic
    window.moveSlider = function(index, buttonEl) {
        const buttons = document.querySelectorAll('#graph-toggles button');
        buttons.forEach(btn => btn.classList.remove('active'));
        buttonEl.classList.add('active');

        const slider = document.getElementById('toggle-slider');
        slider.style.transform = `translateX(${index * 100}%)`;

        // NEU: Diagramm live aktualisieren
        updateDashboardChart(index);
    };

    // Lädt das Diagramm automatisch beim ersten App-Start
    setTimeout(() => {
        if(document.getElementById('dashboard-sales-chart')) updateDashboardChart(0);
    }, 500);

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
        const db = data ? JSON.parse(data) : { containers: [], shops: [], globalHistory: [] };
        if (!db.shops) db.shops = []; 
        if (!db.globalHistory) db.globalHistory = []; // Neues Array für den System-Log
        return db;
    }
    // Speichert die lokale Datenbank
    function saveDatabase(db) {
        localStorage.setItem('paperlogistics_db', JSON.stringify(db));
    }

// --- Database & Confirm Button Logic (V2) ---
    document.getElementById('btn-confirm-v2').addEventListener('click', () => {
        const db = loadDatabase();

        // 1. CONTAINER CHECK: Systemweit eindeutiger Name und nicht leer
        const containerName = masterState.name.trim();
        if (!containerName) {
            alert("Der Container benötigt einen Namen.");
            return;
        }

        const containerNameExists = db.containers.some((c, index) => {
            if (isEditMode && index === currentDetailIndex) return false; 
            return c.name.trim().toLowerCase() === containerName.toLowerCase();
        });
        
        if (containerNameExists) {
            alert(`Der Container-Name "${containerName}" existiert bereits im System. Bitte wähle einen anderen.`);
            return;
        }

        // 2. BLOCK CHECK: Eindeutige Namen innerhalb dieses Containers und nicht leer
        if (childStates.length > 0) {
            // Check auf leere Namen
            const hasEmptyBlockName = childStates.some(child => !child.name.trim());
            if (hasEmptyBlockName) {
                alert("Ein oder mehrere Blöcke haben keinen Namen. Bitte benenne alle Blöcke.");
                return;
            }

            // Check auf Duplikate innerhalb des aktuellen Containers
            const blockNames = childStates.map(child => child.name.trim().toLowerCase());
            const uniqueBlockNames = new Set(blockNames);

            if (blockNames.length !== uniqueBlockNames.size) {
                alert("Fehler: Du hast zwei oder mehr Blöcken denselben Namen gegeben. Jeder Block in diesem Container muss einzigartig heißen.");
                return;
            }
        }

        // Wenn alle Checks bestanden sind -> Aktuelles Datum + exakte Uhrzeit für die Historie generieren
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

// Hole die alten Container-Daten für den präzisen Vorher-Nachher-Vergleich
        const oldContainer = isEditMode ? db.containers[currentDetailIndex] : null;

        childStates.forEach(child => {
            let blockHistory = child.history || [];
            
            // Aufgelöste Werte (Fallback auf Container-Werte, falls beim Block nichts Spezifisches steht)
            const resolvedFormat = child.format || masterState.format;
            const resolvedPrice = child.price || masterState.price;
            const resolvedQuality = child.quality || masterState.quality;
            const resolvedDate = child.date || masterState.date;

            // 1. Wenn der Block brandneu ist (noch keine Historie hat)
            if (blockHistory.length === 0) {
                blockHistory.push({
                    icon: 'fa-plus',
                    text: 'Block Created',
                    time: timeString
                });
            } 
            // 2. Wenn es ein bestehender Block ist, prüfen wir auf ECHTE, individuelle Änderungen
            else if (isEditMode && oldContainer) {
                const oldBlock = (oldContainer.blocks || []).find(b => b.id === child.id);
                
                if (oldBlock) {
                    // Prüfen, ob sich irgendein relevanter Wert für genau diesen Block geändert hat
                    const isChanged = (
                        oldBlock.name !== child.name ||
                        oldBlock.format !== resolvedFormat ||
                        oldBlock.price !== resolvedPrice ||
                        oldBlock.quality !== resolvedQuality ||
                        oldBlock.date !== resolvedDate
                    );

                    if (isChanged) {
                        blockHistory.push({
                            icon: 'fa-pen',
                            text: 'Daten aktualisiert',
                            time: timeString
                        });
                    }
                }
            }

            containerData.blocks.push({
                id: child.id,
                name: child.name, 
                format: resolvedFormat,
                price: resolvedPrice,
                quality: resolvedQuality,
                date: resolvedDate,
                status: child.status || 'available',
                history: blockHistory // Nur die Blöcke mit echten Änderungen bekommen hier den neuen Eintrag
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

// --- List Screen Navigation & Tab Logic ---
    let currentListTab = 'qrcodes'; // Startet immer bei den QR Codes

    document.getElementById('btn-list').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
        renderListScreen();
    });

    window.closeListScreen = function() {
        listScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

    window.switchListTab = function(tabName) {
        currentListTab = tabName;
        
        // Buttons umfärben
        document.getElementById('tab-qrcodes').classList.remove('active');
        document.getElementById('tab-shops').classList.remove('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Liste sofort und sauber neu zeichnen
        renderListScreen();
    };

    window.renderListScreen = function() {
        const qrListContent = document.getElementById('qr-list-content');
        qrListContent.innerHTML = ''; // Zerstört den kompletten alten Inhalt!
        
        const db = loadDatabase();

        if (currentListTab === 'qrcodes') {
            // ==========================================
            // TAB 1: NUR CONTAINER
            // ==========================================
            if (!db.containers || db.containers.length === 0) {
                qrListContent.innerHTML = '<p style="color: #666; text-align: center; margin-top: 20px;">No Containers created yet.</p>';
                return;
            }

            db.containers.forEach((container, index) => {
                function getListAggregated(key) {
                    let values = new Set();
                    if (container[key]) values.add(container[key]);
                    if (container.blocks) container.blocks.forEach(block => { if (block[key]) values.add(block[key]); });
                    return Array.from(values).join(' / ') || '-';
                }

                let displayDate = container.date || '-';
                if (displayDate && displayDate.includes('-')) {
                    const parts = displayDate.split('-');
                    displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }

                const listItem = document.createElement('div');
                listItem.className = 'live-card'; 
                listItem.style.cursor = 'pointer'; 
                listItem.addEventListener('click', () => openDetailScreen(index));
                
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

                const listQRConfig = getQRConfig(false);
                listQRConfig.data = container.id; 
                listQRConfig.width = 85; 
                listQRConfig.height = 85;
                new QRCodeStyling(listQRConfig).append(document.getElementById(`qr-code-${index}`));
            });

        } else if (currentListTab === 'shops') {
       // ==========================================
            // TAB 2: NUR SHOPS
            // ==========================================
            if (!db.shops || db.shops.length === 0) {
                qrListContent.innerHTML = '<p style="color: #666; text-align: center; margin-top: 20px;">No Shops created yet.</p>';
                return;
            }

            // HIER WURDE DAS ", index" HINZUGEFÜGT
            db.shops.forEach((shop, index) => { 
                let displayDate = shop.date || '-';
                if (displayDate && displayDate.includes('-')) {
                    const parts = displayDate.split('-');
                    displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }

                const shopItem = document.createElement('div');
                shopItem.className = 'live-card'; 
                shopItem.style.cursor = 'pointer'; 
                
                // Der Index wird jetzt fehlerfrei übergeben
                const currentIndex = index; 
                shopItem.addEventListener('click', () => openShopDetailScreen(currentIndex));
                
                const avatarHtml = shop.image 
                    ? `<img src="${shop.image}" class="list-avatar">` 
                    : `<div class="list-avatar"><i class="fa-solid fa-store" style="color:#666;"></i></div>`;

       shopItem.innerHTML = `
                    <div style="display: flex; align-items: center; width: 100%;">
                        ${avatarHtml}
                        <div class="card-info">
                            <div class="card-title">${shop.name}</div>
                            <div class="card-detail">Added: ${displayDate}</div>
                            <div class="card-detail" style="color: #0055ff;">${shop.deliveries || 0} Deliveries</div>
                        </div>
                    </div>
                `;
                qrListContent.appendChild(shopItem);
            });
        }
    };
// --- Detail Screen & Edit Logic ---
    let currentDetailIndex = -1;
    let currentDetailSlideIndex = 0; // TRACKT DEN AKTUELLEN FOKUS (0 = Container, 1+ = Block)
    let isEditMode = false;

    window.openDetailScreen = function(containerIndex, startSlide = 0) {
        currentDetailIndex = containerIndex;
        const db = loadDatabase();
        const container = db.containers[containerIndex];
        
        if (!container) return;

        // 1. Screens wechseln
        listScreen.classList.add('hidden');
        detailScreen.classList.remove('hidden');

        // Aggregations-Logik (Container liest alle, Block liest nur sich selbst)
        function getDetailAggregated(item, key, isContainer) {
            let values = new Set();
            if (item[key]) values.add(item[key]);
            if (isContainer && item.blocks) {
                item.blocks.forEach(block => {
                    if (block[key]) values.add(block[key]);
                });
            }
            return Array.from(values).join(' / ') || '-';
        }

        // Datum formatieren
        function formatDisplayDate(dateStr) {
            let displayDate = dateStr || '-';
            if (displayDate && displayDate.includes('-')) {
                const parts = displayDate.split('-');
                displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
            return displayDate;
        }

        const blocks = container.blocks || [];

        // 2. Carousel HTML aufbauen
        let carouselHTML = `<div class="block-carousel" id="detail-block-carousel">`;
        let dotsHTML = `<div class="carousel-dots" id="detail-carousel-dots" style="margin-bottom: 20px;">`; 

        // Slide 0: Container Card (Immer an erster Stelle)
        carouselHTML += `
            <div class="carousel-slide">
                <div class="live-card">
                    <div class="card-info">
                        <div class="card-title">${container.name}</div>
                        <div class="card-detail">Format: ${getDetailAggregated(container, 'format', true)}</div>
                        <div class="card-detail">Price: ${getDetailAggregated(container, 'price', true)}</div>
                        <div class="card-detail">Quality: ${getDetailAggregated(container, 'quality', true)}</div>
                        <div class="card-detail">Date: ${formatDisplayDate(container.date)}</div>
                    </div>
                    <div class="card-qr-box" id="qr-detail-c"></div>
                </div>
            </div>
        `;
        dotsHTML += `<div class="carousel-dot active"></div>`;

        // Slide 1 bis N: Block Cards (In Blau)
        blocks.forEach((block, index) => {
            carouselHTML += `
                <div class="carousel-slide">
                    <div class="live-card card-blue">
                        <div class="card-info">
                            <div class="card-title">${block.name}</div>
                            <div class="card-detail">Format: ${getDetailAggregated(block, 'format', false)}</div>
                            <div class="card-detail">Price: ${getDetailAggregated(block, 'price', false)}</div>
                            <div class="card-detail">Quality: ${getDetailAggregated(block, 'quality', false)}</div>
                            <div class="card-detail">Date: ${formatDisplayDate(block.date || container.date)}</div>
                        </div>
                        <div class="card-qr-box" id="qr-detail-b${index}"></div>
                    </div>
                </div>
            `;
            dotsHTML += `<div class="carousel-dot"></div>`;
        });

        carouselHTML += `</div>`;
        dotsHTML += `</div>`;

        // Ins DOM rendern (Dots nur anzeigen, wenn es auch Blöcke gibt)
        detailCardContainer.innerHTML = carouselHTML + (blocks.length > 0 ? dotsHTML : '');

        // 3. QR Codes in Echtzeit generieren
        const detailQRConfig = getQRConfig(false);
        detailQRConfig.data = container.id;
        detailQRConfig.width = 85; 
        detailQRConfig.height = 85;
        new QRCodeStyling(detailQRConfig).append(document.getElementById('qr-detail-c'));

        blocks.forEach((block, index) => {
            const blockQRConfig = getQRConfig(true);
            blockQRConfig.data = block.id;
            blockQRConfig.width = 85; 
            blockQRConfig.height = 85;
            new QRCodeStyling(blockQRConfig).append(document.getElementById(`qr-detail-b${index}`));
        });

        // 4. Dynamische Historien-Engine
        function renderHistory(activeIndex) {
            detailHistoryList.innerHTML = '';
            let historyData = [];

            if (activeIndex === 0) {
                // Container Historie (Fallback, falls noch nicht vorhanden)
                historyData = container.history || [{
                    icon: 'fa-plus',
                    text: 'Container Created',
                    time: formatDisplayDate(container.date)
                }];
            } else {
                // Block Historie (Fallback, da Blöcke am Anfang keine eigene Historie haben)
                const block = blocks[activeIndex - 1];
                historyData = block.history || [{
                    icon: 'fa-plus',
                    text: 'Block Created',
                    time: formatDisplayDate(block.date || container.date)
                }];
            }

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
        }

        // Initial History rendern (Startet immer beim Container)
        renderHistory(0);

// 5. Swipe-Tracker & Kontext-Engine aktivieren
        const actionContainer = document.querySelector('.detail-actions');
        
        function updateDetailContext(activeIndex) {
            currentDetailSlideIndex = activeIndex;
            if (activeIndex > 0) {
                actionContainer.classList.add('block-mode'); // Färbt die Buttons blau
            } else {
                actionContainer.classList.remove('block-mode'); // Standard Weiß/Grau
            }
        }

        // Initiale Farbe setzen
        updateDetailContext(startSlide);

        if (blocks.length > 0) {
            const carousel = document.getElementById('detail-block-carousel');
            const dots = document.querySelectorAll('#detail-carousel-dots .carousel-dot');
            let lastActiveIndex = startSlide;

            // Wenn wir durch eine Aktion (z.B. QR-Druck) direkt auf einen Block springen
            if (startSlide > 0) {
                setTimeout(() => {
                    carousel.scrollLeft = carousel.clientWidth * startSlide;
                    renderHistory(startSlide);
                }, 10);
            }

            carousel.addEventListener('scroll', () => {
                const activeIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
                if (activeIndex !== lastActiveIndex) {
                    dots.forEach(d => d.classList.remove('active'));
                    if(dots[activeIndex]) dots[activeIndex].classList.add('active');
                    
                    renderHistory(activeIndex);
                    updateDetailContext(activeIndex); // Wechselt die Farben der Action-Bar live
                    
                    if (navigator.vibrate) navigator.vibrate(10);
                    lastActiveIndex = activeIndex;
                }
            });
        }
    };
  

    window.closeDetailScreen = function() {
        detailScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
    };
   // --- Edit Actions ---
    
    // BEARBEITEN: Lädt die Daten und springt zum richtigen Element
    document.getElementById('btn-edit-container').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        if (!container) return;

        isEditMode = true;

        masterState = {
            id: container.id, name: container.name, format: container.format || '',
            blocks: container.blocks ? container.blocks.length : 0, price: container.price || '',
            quality: container.quality || '', date: container.date || ''
        };

        childStates = [];
        if (container.blocks) {
            container.blocks.forEach(b => {
                childStates.push({
                    id: b.id, name: b.name, format: b.format, price: b.price,
                    quality: b.quality, date: b.date, status: b.status || 'available', history: b.history
                });
            });
        }

        currentActiveIndex = -1;
        document.getElementById('v2-name').value = masterState.name;
        document.getElementById('v2-date').value = masterState.date;
        
        resetToggles();
        document.querySelectorAll('#v2-blocks button').forEach(b => {
            if (parseInt(b.getAttribute('data-val')) <= masterState.blocks) b.classList.add('active');
        });

        renderCards();
        
        detailScreen.classList.add('hidden');
        newContainerScreen.classList.remove('hidden');

        // MAGIE: Wenn wir auf einem Block waren, scrollt der Editor automatisch exakt zu diesem Block
        setTimeout(() => {
            const slider = document.getElementById('card-slider');
            if (currentDetailSlideIndex > 0) {
                slider.scrollLeft = slider.clientWidth * currentDetailSlideIndex;
            } else {
                updateUIFromScroll(-1);
                slider.scrollLeft = 0;
            }
        }, 50);
    });

   // --- Universal Delete Engine ---
    const deletePopup = document.getElementById('delete-popup');
    let deleteTargetMode = ''; // Kann 'container', 'block' oder 'shop' sein

    // POPUP ÖFFNEN: CONTAINER ODER BLOCK
    document.getElementById('btn-delete-container').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        const titleEl = document.querySelector('#delete-popup .popup-title');
        
        if (currentDetailSlideIndex > 0) {
            deleteTargetMode = 'block';
            const blockName = container.blocks[currentDetailSlideIndex - 1].name;
            if (titleEl) titleEl.textContent = `Block "${blockName}" löschen?`;
        } else {
            deleteTargetMode = 'container';
            if (titleEl) titleEl.textContent = `Container "${container.name}" löschen?`;
        }
        deletePopup.classList.remove('hidden');
    });

    // POPUP ÖFFNEN: SHOP
    document.getElementById('btn-delete-shop').addEventListener('click', () => {
        deleteTargetMode = 'shop';
        const db = loadDatabase();
        const shop = db.shops[currentShopIndex];
        const titleEl = document.querySelector('#delete-popup .popup-title');
        
        if (titleEl) titleEl.textContent = `Shop "${shop.name}" löschen?`;
        deletePopup.classList.remove('hidden');
    });

    // LÖSCHEN ABBRECHEN (No)
    document.getElementById('btn-popup-no').addEventListener('click', () => {
        deletePopup.classList.add('hidden');
    });

    // LÖSCHEN BESTÄTIGEN (Yes)
    document.getElementById('btn-popup-yes').addEventListener('click', () => {
        const db = loadDatabase();
        
        if (deleteTargetMode === 'shop') {
            // --- SHOP LÖSCHEN ---
            db.shops.splice(currentShopIndex, 1);
            saveDatabase(db);

            deletePopup.classList.add('hidden');
            document.getElementById('shop-detail-screen').classList.add('hidden');
            listScreen.classList.remove('hidden');
            renderListScreen(); 

        } else if (deleteTargetMode === 'block') {
            // --- BLOCK LÖSCHEN ---
            const container = db.containers[currentDetailIndex];
            const blockIndex = currentDetailSlideIndex - 1;
            const blockName = container.blocks[blockIndex].name;
            
            container.blocks.splice(blockIndex, 1);
            
            const now = new Date();
            const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (!container.history) container.history = [];
            container.history.push({ icon: 'fa-trash', text: `Block "${blockName}" gelöscht`, time: timeString });
            
            db.containers[currentDetailIndex] = container;
            saveDatabase(db);
            
            deletePopup.classList.add('hidden');
            openDetailScreen(currentDetailIndex, 0); 
            
        } else if (deleteTargetMode === 'container') {
            // --- CONTAINER LÖSCHEN ---
            db.containers.splice(currentDetailIndex, 1);
            saveDatabase(db);

            deletePopup.classList.add('hidden');
            detailScreen.classList.add('hidden');
            listScreen.classList.remove('hidden');
            renderListScreen(); 
        }
    });

    // --- Scanner Logic (ZXing Engine) ---
    const scanScreen = document.getElementById('scan-screen');
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let isScanning = false;
    let isStopping = false; 
    
    // NEUE STATE-VARIABLEN FÜR EXCHANGE
    let scanMode = 'default'; 
    let tempExchangeBlocks = []; 
    let exchangeTargetContainerIndex = -1;

    // Hilfsfunktion: Hardware-Kamera physisch vom Video-Element trennen
    async function stopScanner() {
        codeReader.reset();
        const videoEl = document.getElementById('video-preview');
        if (videoEl && videoEl.srcObject) {
            const stream = videoEl.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop()); // Tötet die Kamera auf Systemebene
            videoEl.srcObject = null;
        }
    }

    // Zentralisierte Scanner-Start-Logik (kann jetzt von überall aufgerufen werden)
    async function startScannerAction() {
        if (isScanning) return; // Guard
        isScanning = true;

        homeScreen.classList.add('hidden'); // Schadet nicht, wenn er schon versteckt ist
        scanScreen.classList.remove('hidden');

        document.getElementById('video-preview').setAttribute('playsinline', 'true');

        try {
            const constraints = { video: { facingMode: "environment" } };

            codeReader.decodeFromConstraints(constraints, 'video-preview', async (result, err) => {
                if (result) {
                    if (!isScanning) return;
                    isScanning = false;
                    
                    try { await codeReader.pause(); } catch(e) {}
                    if (navigator.vibrate) navigator.vibrate(50);
                    
                    await stopScanner();
                    scanScreen.classList.add('hidden');
                    
                    // NEU: Routing je nach Scan-Modus
                    if (scanMode === 'exchange') {
                        handleExchangeScan(result.getText());
                    } else {
                        handleDefaultScan(result.getText());
                    }
                }
                if (err && !(err instanceof ZXing.NotFoundException)) console.warn("ZXing Reader Error:", err);
            });
        } catch (err) {
            console.error("Kamera-Fehler:", err);
            alert("Kamera konnte nicht gestartet werden.");
            await stopScanner();
            isScanning = false;
            scanScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        }
    } // <--- HIER WAR DIE VERLORENE KLAMMER, DIE ALLES ZERSTÖRT HAT

    // Normaler Scan vom Home-Screen
    document.getElementById('btn-scan-qr').addEventListener('click', () => {
        scanMode = 'default';
        startScannerAction();
    });

    // Alte Navigation (ausgelagert aus onScanSuccess)
    function handleDefaultScan(decodedText) {
        const db = loadDatabase();
        let targetContainerIndex = db.containers.findIndex(c => c.id === decodedText);

        if (targetContainerIndex === -1) {
            for (let i = 0; i < db.containers.length; i++) {
                const container = db.containers[i];
                if (container.blocks && container.blocks.some(b => b.id === decodedText)) {
                    targetContainerIndex = i; break;
                }
            }
        }

        if (targetContainerIndex !== -1) {
            openDetailScreen(targetContainerIndex);
        } else {
            alert(`QR-Code (${decodedText}) gehört zu keinem Container.`);
            homeScreen.classList.remove('hidden');
        }
    }

    // Schließt den Scanner manuell (Back Button)
    window.closeScanScreen = async function() {
        isScanning = false;
        await stopScanner();
        scanScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

    // QR DRUCKEN: Speichert Container- ODER Block-QR-Code
    document.getElementById('btn-print-qr').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        if (!container) return;

        let targetItem, isBlock, fileName;

        // Kontext auswerten
        if (currentDetailSlideIndex > 0) {
            targetItem = container.blocks[currentDetailSlideIndex - 1];
            isBlock = true;
            fileName = `${targetItem.name}_QR`;
        } else {
            targetItem = container;
            isBlock = false;
            fileName = `${container.name}_QR`;
        }

        const printConfig = getQRConfig(isBlock);
        printConfig.data = targetItem.id;
        printConfig.width = 1024;  
        printConfig.height = 1024;
        printConfig.backgroundOptions = { color: "#ffffff" }; 
        printConfig.margin = 50; 
        
        new QRCodeStyling(printConfig).download({ name: fileName, extension: "png" });

        // Historie NUR für das exportierte Item schreiben
        const now = new Date();
        const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (!targetItem.history) targetItem.history = [];
        targetItem.history.push({ icon: 'fa-print', text: 'QR-Code gespeichert', time: timeString });

        db.containers[currentDetailIndex] = container;
        saveDatabase(db);
        
        // Neu laden und wieder auf den gleichen Block springen
        openDetailScreen(currentDetailIndex, currentDetailSlideIndex);
    });

    // --- Exchange Selection Logic ---
    const exchangeScreen = document.getElementById('exchange-screen');
    const exchangeBlockList = document.getElementById('exchange-block-list');
    const btnExchangeTarget = document.getElementById('btn-exchange-target');
    let exchangeSelectedBlocks = []; // Speichert die IDs der ausgewählten Blöcke

    // TRANSFER: Öffnet Auswahl (Container) ODER direkt den Scanner (Block)
// NEUER STATE TRACKER FÜR DEN WORKFLOW
    let activeWorkflow = 'exchange'; // 'exchange' oder 'sell'

    // TRANSFER: Öffnet Auswahl (Container) ODER direkt den Scanner (Block)
    document.getElementById('btn-exchange').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        
        if (!container.blocks || container.blocks.length === 0) {
            alert('Dieser Container ist leer.'); return;
        }

        activeWorkflow = 'exchange';
        document.querySelector('#exchange-screen h2').textContent = 'SELECT BLOCKS';
        document.getElementById('btn-exchange-target').textContent = 'Target';

        if (currentDetailSlideIndex > 0) {
            // BLOCK MODUS (Direktflug zum Scanner)
            const block = container.blocks[currentDetailSlideIndex - 1];
            exchangeSelectedBlocks = [block.id];
            tempExchangeBlocks = [{ ...block }]; // Puffer für Namenskonflikte laden
            
            scanMode = 'exchange';
            detailScreen.classList.add('hidden');
            startScannerAction(); 
        } else {
            // CONTAINER MODUS (Klassische Auswahl)
            exchangeSelectedBlocks = [];
            detailScreen.classList.add('hidden');
            exchangeScreen.classList.remove('hidden');
            renderExchangeList();
        }
    });

    // VERKAUF: Öffnet Auswahl (Container) ODER überspringt sie und geht direkt zum Shop (Block)
    document.getElementById('btn-sell').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        
        if (!container.blocks || container.blocks.length === 0) {
            alert('Dieser Container ist leer.'); return;
        }

        activeWorkflow = 'sell';
        document.querySelector('#exchange-screen h2').textContent = 'SELECT BLOCKS TO SELL';
        document.getElementById('btn-exchange-target').textContent = 'Next';

        if (currentDetailSlideIndex > 0) {
            // BLOCK MODUS (Direktflug zur Shop-Auswahl)
            const block = container.blocks[currentDetailSlideIndex - 1];
            exchangeSelectedBlocks = [block.id];
            tempExchangeBlocks = [{ ...block }]; 
            
            detailScreen.classList.add('hidden');
            openShopSelectScreen(); // <--- Überspringt die Block-Auswahl und geht sofort zu den Shops
        } else {
            // CONTAINER MODUS (Klassische Auswahl)
            exchangeSelectedBlocks = [];
            detailScreen.classList.add('hidden');
            exchangeScreen.classList.remove('hidden');
            renderExchangeList();
        }
    });

    // Zeichnet die Liste und checkt den Auswahl-Status
    function renderExchangeList() {
        exchangeBlockList.innerHTML = '';
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];

        container.blocks.forEach((block) => {
            const isSelected = exchangeSelectedBlocks.includes(block.id);

            const card = document.createElement('div');
            // Nutzt dein live-card Design + die speziellen Selektions-Klassen
            card.className = `live-card exchange-card ${isSelected ? 'selected card-blue' : 'unselected'}`;
            card.innerHTML = `
                <div class="card-info" style="padding-right: 40px;">
                    <div class="card-title">${block.name}</div>
                    <div class="card-detail">Format: ${block.format || '-'}</div>
                    <div class="card-detail">Quality: ${block.quality || '-'}</div>
                </div>
                <i class="fa-solid ${isSelected ? 'fa-circle-check' : 'fa-circle'} exchange-check-icon"></i>
            `;

            // Toggle-Logik beim Tippen auf die Karte
            card.addEventListener('click', () => {
                if (isSelected) {
                    // Entfernen, wenn schon gewählt
                    exchangeSelectedBlocks = exchangeSelectedBlocks.filter(id => id !== block.id);
                } else {
                    // Hinzufügen
                    exchangeSelectedBlocks.push(block.id);
                }
                
                // Haptisches Feedback für das "Greifen" eines Blocks
                if (navigator.vibrate) navigator.vibrate(30);
                
                renderExchangeList(); // UI direkt updaten
            });

            exchangeBlockList.appendChild(card);
        });

        // Target Button evaluieren
        if (exchangeSelectedBlocks.length > 0) {
            btnExchangeTarget.classList.remove('disabled');
            btnExchangeTarget.classList.add('active');
            btnExchangeTarget.disabled = false;
        } else {
            btnExchangeTarget.classList.remove('active');
            btnExchangeTarget.classList.add('disabled');
            btnExchangeTarget.disabled = true;
        }
    }

    // Schließt den Exchange Screen und verwirft die Auswahl (Keine Speicherung)
    window.closeExchangeScreen = function() {
        exchangeScreen.classList.add('hidden');
        detailScreen.classList.remove('hidden');
        exchangeSelectedBlocks = []; // Speicher hart leeren
    };

    // --- Exchange Target & Conflict Logic ---

// 1. Target / Next Button kicken
    document.getElementById('btn-exchange-target').addEventListener('click', () => {
        if (exchangeSelectedBlocks.length === 0) return;

        const db = loadDatabase();
        const sourceContainer = db.containers[currentDetailIndex];

        // Deep-Copy der ausgewählten Blöcke in den Puffer
        tempExchangeBlocks = sourceContainer.blocks
            .filter(b => exchangeSelectedBlocks.includes(b.id))
            .map(b => ({ ...b })); 

        exchangeScreen.classList.add('hidden');

        // HYBRID WEICHE: Wohin geht die Reise?
        if (activeWorkflow === 'exchange') {
            scanMode = 'exchange';
            startScannerAction(); // Transfer -> Scanner öffnen
        } else if (activeWorkflow === 'sell') {
            openShopSelectScreen(); // Verkauf -> Shop-Liste öffnen
        }
    });

    // 2. Die Auswertung des Scans
    window.handleExchangeScan = function(decodedText) {
        const db = loadDatabase();
        let isBlock = false;

        // Prüfen: Ist das Ziel ein Block?
        db.containers.forEach(c => {
            if (c.blocks && c.blocks.some(b => b.id === decodedText)) isBlock = true;
        });

        if (isBlock) {
            alert("Error: Du hast einen Block gescannt. Das Ziel muss ein Container sein.");
            scanMode = 'default';
            exchangeScreen.classList.remove('hidden');
            return;
        }

        // Prüfen: Ist es ein echter Container?
        const foundTargetIndex = db.containers.findIndex(c => c.id === decodedText);
        if (foundTargetIndex === -1) {
            alert("Error: Ziel-Container nicht gefunden.");
            scanMode = 'default';
            exchangeScreen.classList.remove('hidden');
            return;
        }

        // Prüfen: Ist es DERSELBE Container?
        if (foundTargetIndex === currentDetailIndex) {
            alert("Error: Du kannst Blöcke nicht in ihren eigenen, aktuellen Container umlagern.");
            scanMode = 'default';
            exchangeScreen.classList.remove('hidden');
            return;
        }

        // Alles gültig! Ziel sichern und auf Namenskonflikte prüfen
        exchangeTargetContainerIndex = foundTargetIndex;
        checkExchangeConflicts();
    };

    // 3. Konflikte aufspüren
    function checkExchangeConflicts() {
        const db = loadDatabase();
        const targetBlocks = db.containers[exchangeTargetContainerIndex].blocks || [];

        // Finde den ersten Block im Puffer, dessen Name im Ziel-Container existiert
        let conflictBlock = tempExchangeBlocks.find(tempBlock =>
            targetBlocks.some(tb => tb.name.toLowerCase() === tempBlock.name.toLowerCase())
        );

        if (conflictBlock) {
            // Konflikt gefunden -> Popup zeigen
            document.getElementById('conflict-block-name').textContent = conflictBlock.name;
            document.getElementById('conflict-new-name').value = '';
            document.getElementById('conflict-new-name').dataset.blockId = conflictBlock.id;
            document.getElementById('conflict-popup').classList.remove('hidden');
        } else {
            // Keine Konflikte (mehr) -> Review Screen öffnen
            openReviewExchangeScreen();
        }
    }

    // 4. Konflikt abbrechen (Vorgang stirbt)
    document.getElementById('btn-conflict-cancel').addEventListener('click', () => {
        document.getElementById('conflict-popup').classList.add('hidden');
        scanMode = 'default';
        tempExchangeBlocks = []; // Puffer löschen, Namen werden zurückgesetzt
        exchangeScreen.classList.remove('hidden'); // Zurück zur Auswahl
    });

    // 5. Konflikt lösen
    document.getElementById('btn-conflict-apply').addEventListener('click', () => {
        const newName = document.getElementById('conflict-new-name').value.trim();
        const blockId = document.getElementById('conflict-new-name').dataset.blockId;

        if (!newName) {
            alert("Bitte gib einen Namen ein."); 
            return;
        }

        const db = loadDatabase();
        const targetBlocks = db.containers[exchangeTargetContainerIndex].blocks || [];

        // Doppelte Prüfung: Name darf weder im Ziel existieren, noch bei den anderen zu bewegenden Blöcken
        const nameInTarget = targetBlocks.some(tb => tb.name.toLowerCase() === newName.toLowerCase());
        const nameInTemp = tempExchangeBlocks.some(tb => tb.id !== blockId && tb.name.toLowerCase() === newName.toLowerCase());

        if (nameInTarget || nameInTemp) {
            alert("Dieser Name ist ebenfalls belegt. Bitte wähle einen anderen.");
            return;
        }

        // Neuen Namen nur im temporären Puffer speichern
        const blockToRename = tempExchangeBlocks.find(b => b.id === blockId);
        if (blockToRename) blockToRename.name = newName;

        document.getElementById('conflict-popup').classList.add('hidden');
        
        // Loop: Gibt es noch weitere Konflikte?
        checkExchangeConflicts(); 
    });

    // 6. Review Screen rendern (Vollständige ID-Cards + Carousel)
    function openReviewExchangeScreen() {
        const db = loadDatabase();
        const sourceContainer = db.containers[currentDetailIndex];
        const targetContainer = db.containers[exchangeTargetContainerIndex];

        // FROM Card (Rot)
        document.getElementById('review-from-container').innerHTML = createFullCardHTML(sourceContainer, 'red', 'from');

        // TO Card (Grün)
        document.getElementById('review-to-container').innerHTML = createFullCardHTML(targetContainer, 'green', 'to');

        // WHAT Cards (Blaues Swipe-Carousel)
        const whatContainer = document.getElementById('review-what-container');
        let carouselHTML = `<div class="block-carousel" id="review-block-carousel">`;
        let dotsHTML = `<div class="carousel-dots" id="review-carousel-dots">`;

        tempExchangeBlocks.forEach((block, index) => {
            carouselHTML += `
                <div class="carousel-slide">
                    ${createFullCardHTML(block, 'blue', `what-${index}`)}
                </div>
            `;
            dotsHTML += `<div class="carousel-dot ${index === 0 ? 'active' : ''}"></div>`;
        });

        carouselHTML += `</div>`;
        dotsHTML += `</div>`;
        
        whatContainer.innerHTML = carouselHTML + (tempExchangeBlocks.length > 1 ? dotsHTML : '');

        document.getElementById('review-exchange-screen').classList.remove('hidden');

        // QR-Codes physisch generieren (false = schwarz für Container, true = blau für Blöcke)
        renderReviewQRCode(sourceContainer.id, 'qr-from', false);
        renderReviewQRCode(targetContainer.id, 'qr-to', false);
        tempExchangeBlocks.forEach((block, index) => {
            renderReviewQRCode(block.id, `qr-what-${index}`, true);
        });

        // Swipe-Logik für die Dots
        if (tempExchangeBlocks.length > 1) {
            const carousel = document.getElementById('review-block-carousel');
            const dots = document.querySelectorAll('#review-carousel-dots .carousel-dot');
            
            carousel.addEventListener('scroll', () => {
                const activeIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
                dots.forEach(d => d.classList.remove('active'));
                if(dots[activeIndex]) dots[activeIndex].classList.add('active');
            });
        }
    }

    // Hilfsfunktion: Baut die EXAKTE 1:1 HTML-Struktur der Original-Live-Card inkl. Aggregation
    function createFullCardHTML(item, colorClass, qrIdSuffix) {
        // Aggregations-Logik direkt integriert (liest Container und dessen Blöcke aus)
        function getCardAggregated(key) {
            let values = new Set();
            if (item[key]) values.add(item[key]);
            if (item.blocks && item.blocks.length > 0) {
                item.blocks.forEach(block => {
                    if (block[key]) values.add(block[key]);
                });
            }
            return Array.from(values).join(' / ') || '-';
        }

        // Datumsauszug im exakt gleichen Format wie in der Liste
        let displayDate = item.date || '-';
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }

        return `
            <div class="live-card card-${colorClass}">
                <div class="card-info">
                    <div class="card-title">${item.name}</div>
                    <div class="card-detail">Format: ${getCardAggregated('format')}</div>
                    <div class="card-detail">Price: ${getCardAggregated('price')}</div>
                    <div class="card-detail">Quality: ${getCardAggregated('quality')}</div>
                    <div class="card-detail">Date: ${displayDate}</div>
                </div>
                <div class="card-qr-box" id="qr-${qrIdSuffix}"></div>
            </div>
        `;
    }

    // Hilfsfunktion: Nutzt exakt dieselben QR-Settings wie der Rest der App
    function renderReviewQRCode(dataString, elementId, isBlock) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.innerHTML = ''; 
        
        const config = getQRConfig(isBlock);
        config.data = dataString;
        config.width = 85; 
        config.height = 85;
        
        const qrCode = new QRCodeStyling(config);
        qrCode.append(el);
    }

    // 7. Review Abbrechen
    window.cancelReviewExchange = function() {
        document.getElementById('review-exchange-screen').classList.add('hidden');
        scanMode = 'default';
        tempExchangeBlocks = []; 
        exchangeScreen.classList.remove('hidden'); // Zurück zur Auswahl
    };

    // 8. Transfer bestätigen & ausführen
    document.getElementById('btn-confirm-exchange').addEventListener('click', () => {
        const db = loadDatabase();
        const sourceContainer = db.containers[currentDetailIndex];
        const targetContainer = db.containers[exchangeTargetContainerIndex];

        if (!sourceContainer || !targetContainer) return;

        // 1. Blöcke aus der Quelle entfernen
        sourceContainer.blocks = sourceContainer.blocks.filter(b => !exchangeSelectedBlocks.includes(b.id));

        // 2. Blöcke ins Ziel einfügen
        if (!targetContainer.blocks) targetContainer.blocks = [];
        targetContainer.blocks.push(...tempExchangeBlocks);

        // 3. Audit-Trail (Historie) für Container UND Blöcke schreiben
        const now = new Date();
        const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const blockCount = tempExchangeBlocks.length;
        const blockText = blockCount === 1 ? '1 Block' : `${blockCount} Blöcke`;

        // Historie Quelle (Ausgang)
        if (!sourceContainer.history) sourceContainer.history = [];
        sourceContainer.history.push({
            icon: 'fa-right-left',
            text: `${blockText} an ${targetContainer.name} übergeben`,
            time: timeString
        });

        // Historie Ziel (Eingang)
        if (!targetContainer.history) targetContainer.history = [];
        targetContainer.history.push({
            icon: 'fa-right-left',
            text: `${blockText} von ${sourceContainer.name} erhalten`,
            time: timeString
        });

        // WICHTIG: Historie für JEDEN EINZELNEN Block schreiben
        tempExchangeBlocks.forEach(block => {
            if (!block.history) {
                let fallbackDate = block.date || sourceContainer.date || timeString;
                if (fallbackDate && fallbackDate.includes('-')) {
                    const parts = fallbackDate.split('-');
                    fallbackDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }
                block.history = [{
                    icon: 'fa-plus',
                    text: 'Block Created',
                    time: fallbackDate
                }];
            }
            
            block.history.push({
                icon: 'fa-right-left',
                text: `Umgelagert aus ${sourceContainer.name}`,
                time: timeString
            });
        });

        // 4. Datenbank speichern
        db.containers[currentDetailIndex] = sourceContainer;
        db.containers[exchangeTargetContainerIndex] = targetContainer;
        saveDatabase(db);

        // 5. Erfolgs-Feedback
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

        // 6. Aufräumen der Puffer
        exchangeSelectedBlocks = [];
        tempExchangeBlocks = [];
        scanMode = 'default';

        // 7. Screens wechseln und UI aktualisieren
        document.getElementById('review-exchange-screen').classList.add('hidden');
        openDetailScreen(currentDetailIndex); 
    });

    // --- PDF Export Logic ---
    function formatPdfDate(dateStr) {
        let displayDate = dateStr || '-';
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return displayDate;
    }

    function getPdfAggregated(item, key, isContainer) {
        let values = new Set();
        if (item[key]) values.add(item[key]);
        if (isContainer && item.blocks) {
            item.blocks.forEach(block => {
                if (block[key]) values.add(block[key]);
            });
        }
        return Array.from(values).join(' / ') || '-';
    }

    function buildPdfCardHtml(item, isContainer, qrIdSuffix) {
        return `
            <div class="pdf-card">
                <div class="pdf-card-info">
                    <div class="pdf-card-title">${item.name}</div>
                    <div class="pdf-card-detail">ID: ${item.id}</div>
                    <div class="pdf-card-detail">Format: ${getPdfAggregated(item, 'format', isContainer)}</div>
                    <div class="pdf-card-detail">Price: ${getPdfAggregated(item, 'price', isContainer)}</div>
                    <div class="pdf-card-detail">Quality: ${getPdfAggregated(item, 'quality', isContainer)}</div>
                    <div class="pdf-card-detail">Date: ${formatPdfDate(item.date)}</div>
                </div>
                <div class="pdf-qr-box" id="pdf-qr-${qrIdSuffix}"></div>
            </div>
        `;
    }

    function buildPdfHistoryHtml(historyArray) {
        if (!historyArray || historyArray.length === 0) return '<p style="color:#888;">Keine Historie vorhanden.</p>';
        
        let html = `<div class="pdf-history-list">`;
        historyArray.slice().reverse().forEach(entry => {
            html += `
                <div class="pdf-history-item">
                    <span class="pdf-history-text">${entry.text}</span>
                    <span class="pdf-history-date">${entry.time}</span>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    }

    document.getElementById('btn-export-pdf').addEventListener('click', async () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        if (!container) return;

        const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        const docId = `DOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${randomHex}`;
        
        const now = new Date();
        const printTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let pdfHtml = '';

        if (currentDetailSlideIndex > 0) {
            const block = container.blocks[currentDetailSlideIndex - 1];
            pdfHtml += `
                <div class="pdf-page">
                    <div class="pdf-header">
                        <div>CREATED: ${printTime}</div>
                        <div>DOC-ID: ${docId}</div>
                    </div>
                    <div class="pdf-section-title">INDIVIDUAL BLOCK DOSSIER</div>
                    <div class="pdf-block-wrapper">
                        ${buildPdfCardHtml(block, false, 'b0')}
                        <div class="pdf-history-title">Block History</div>
                        ${buildPdfHistoryHtml(block.history)}
                    </div>
                </div>
            `;
        } else {
            pdfHtml += `
                <div class="pdf-page">
                    <div class="pdf-header">
                        <div>CREATED: ${printTime}</div>
                        <div>DOC-ID: ${docId}</div>
                    </div>
                    <div class="pdf-section-title">CONTAINER DOSSIER</div>
                    ${buildPdfCardHtml(container, true, 'c')}
                    <div class="pdf-history-title">Container History</div>
                    ${buildPdfHistoryHtml(container.history)}
                </div>
            `;

            if (container.blocks && container.blocks.length > 0) {
                pdfHtml += `<div class="html2pdf__page-break"></div><div class="pdf-page"><div class="pdf-header"><div>CREATED: ${printTime}</div><div>DOC-ID: ${docId}</div></div><div class="pdf-section-title">BLOCK DOSSIERS</div>`;
                container.blocks.forEach((block, index) => {
                    pdfHtml += `
                        <div class="pdf-block-wrapper">
                            ${buildPdfCardHtml(block, false, `b${index}`)}
                            <div class="pdf-history-title">Block History</div>
                            ${buildPdfHistoryHtml(block.history)}
                        </div>
                        <div style="margin-bottom: 50px;"></div>
                    `;
                });
                pdfHtml += `</div>`;
            }
        }

        const stagingArea = document.getElementById('pdf-export-container');
        stagingArea.innerHTML = pdfHtml;

        const qrConfig = getQRConfig(false); 
        qrConfig.width = 90; qrConfig.height = 90; qrConfig.margin = 0; qrConfig.backgroundOptions = { color: "#ffffff" };

        if (currentDetailSlideIndex > 0) {
            const blockQrConfig = { ...qrConfig, data: container.blocks[currentDetailSlideIndex - 1].id, dotsOptions: { color: "#0055ff", type: "square" }, cornersSquareOptions: { color: "#0055ff", type: "square" }, cornersDotOptions: { color: "#0055ff", type: "square" } };
            new QRCodeStyling(blockQrConfig).append(document.getElementById('pdf-qr-b0'));
        } else {
            qrConfig.data = container.id;
            new QRCodeStyling(qrConfig).append(document.getElementById('pdf-qr-c'));
            if (container.blocks) {
                container.blocks.forEach((block, index) => {
                    const blockQrConfig = { ...qrConfig, data: block.id, dotsOptions: { color: "#0055ff", type: "square" }, cornersSquareOptions: { color: "#0055ff", type: "square" }, cornersDotOptions: { color: "#0055ff", type: "square" } };
                    new QRCodeStyling(blockQrConfig).append(document.getElementById(`pdf-qr-b${index}`));
                });
            }
        }

        const originalBtnColor = document.getElementById('btn-export-pdf').style.backgroundColor;
        document.getElementById('btn-export-pdf').style.backgroundColor = '#00C851';

        setTimeout(() => {
            const opt = {
                margin:       0, 
                filename:     `${container.name}_Dossier_${docId}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'], avoid: '.pdf-block-wrapper' } 
            };

            html2pdf().set(opt).from(stagingArea).save().then(() => {
                stagingArea.innerHTML = '';
                document.getElementById('btn-export-pdf').style.backgroundColor = originalBtnColor;
            });
        }, 500);
    });

    // --- New & Edit Shop Engine ---
    const newShopScreen = document.getElementById('new-shop-screen');
    const shopAvatarInput = document.getElementById('shop-avatar-input');
    const shopAvatarPreview = document.getElementById('shop-avatar-preview');
    let tempShopImageBase64 = null;
    
    let isShopEditMode = false;
    let editingShopIndex = -1;

    document.getElementById('btn-add-shop').addEventListener('click', () => {
        isShopEditMode = false;
        editingShopIndex = -1;
        
        homeScreen.classList.add('hidden');
        newShopScreen.classList.remove('hidden');
        
        document.querySelector('#new-shop-screen h2').textContent = 'NEW SHOP';
        
        document.getElementById('shop-name-input').value = '';
        shopAvatarPreview.src = '';
        shopAvatarPreview.classList.add('hidden');
        tempShopImageBase64 = null;
    });

    window.closeNewShopScreen = function() {
        newShopScreen.classList.add('hidden');
        if (isShopEditMode) {
            document.getElementById('shop-detail-screen').classList.remove('hidden');
        } else {
            homeScreen.classList.remove('hidden');
        }
    };

    document.getElementById('btn-shop-avatar').addEventListener('click', () => {
        shopAvatarInput.click();
    });

    shopAvatarInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 300; 
                
                canvas.width = size;
                canvas.height = size;
                
                const minSide = Math.min(img.width, img.height);
                const startX = (img.width - minSide) / 2;
                const startY = (img.height - minSide) / 2;
                
                ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, size, size);
                
                tempShopImageBase64 = canvas.toDataURL('image/jpeg', 0.7); 
                
                shopAvatarPreview.src = tempShopImageBase64;
                shopAvatarPreview.classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('btn-edit-shop').addEventListener('click', () => {
        const db = loadDatabase();
        const shop = db.shops[currentShopIndex];
        if (!shop) return;

        isShopEditMode = true;
        editingShopIndex = currentShopIndex;

        document.getElementById('shop-detail-screen').classList.add('hidden');
        newShopScreen.classList.remove('hidden');
        
        document.querySelector('#new-shop-screen h2').textContent = 'EDIT SHOP';

        document.getElementById('shop-name-input').value = shop.name;
        if (shop.image) {
            tempShopImageBase64 = shop.image;
            shopAvatarPreview.src = shop.image;
            shopAvatarPreview.classList.remove('hidden');
        } else {
            tempShopImageBase64 = null;
            shopAvatarPreview.src = '';
            shopAvatarPreview.classList.add('hidden');
        }
    });
    
    document.getElementById('btn-confirm-shop').addEventListener('click', () => {
        const shopName = document.getElementById('shop-name-input').value.trim();
        
        if (!shopName) {
            alert("Bitte gib einen Namen für den Shop ein.");
            return;
        }

        const db = loadDatabase();
        
        const nameExists = db.shops.some((s, index) => {
            if (isShopEditMode && index === editingShopIndex) return false;
            return s.name.toLowerCase() === shopName.toLowerCase();
        });

        if (nameExists) {
            alert("Ein Shop mit diesem Namen existiert bereits!");
            return;
        }

        const now = new Date();
        const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (isShopEditMode) {
            const shop = db.shops[editingShopIndex];
            
            const isChanged = (shop.name !== shopName || shop.image !== tempShopImageBase64);

            shop.name = shopName;
            shop.image = tempShopImageBase64;

            if (isChanged) {
                if (!shop.history) shop.history = [];
                shop.history.push({
                    icon: 'fa-pen',
                    text: 'Daten aktualisiert',
                    time: timeString
                });
            }
            
            db.shops[editingShopIndex] = shop;
            saveDatabase(db);
            
            newShopScreen.classList.add('hidden');
            openShopDetailScreen(editingShopIndex); 

        } else {
            const newShop = {
                id: generateUUID('S'),
                name: shopName,
                image: tempShopImageBase64,
                date: new Date().toISOString().split('T')[0],
                history: [{
                    icon: 'fa-plus',
                    text: 'Shop im System angelegt',
                    time: timeString
                }]
            };

            db.shops.push(newShop);
            saveDatabase(db);
            
            newShopScreen.classList.add('hidden');
            listScreen.classList.remove('hidden');
            switchListTab('shops');
        }
    });

    // --- Shop Detail Screen Logic ---
    let currentShopIndex = -1;

    window.openShopDetailScreen = function(shopIndex) {
        currentShopIndex = shopIndex;
        const db = loadDatabase();
        const shop = db.shops[shopIndex];
        
        if (!shop) return;

        listScreen.classList.add('hidden');
        document.getElementById('shop-detail-screen').classList.remove('hidden');

        let displayDate = shop.date || '-';
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }

        const avatarHtml = shop.image 
            ? `<img src="${shop.image}" class="list-avatar">` 
            : `<div class="list-avatar"><i class="fa-solid fa-store" style="color:#666;"></i></div>`;

// Card rendern (identisch zum Listen-Layout, aber ohne Hover/Klick)
        document.getElementById('shop-detail-card-container').innerHTML = `
            <div class="live-card">
                <div style="display: flex; align-items: center; width: 100%;">
                    ${avatarHtml}
                    <div class="card-info">
                        <div class="card-title">${shop.name}</div>
                        <div class="card-detail">Added: ${displayDate}</div>
                        <div class="card-detail" style="color: #0055ff;">${shop.deliveries || 0} Deliveries</div>
                    </div>
                </div>
            </div>
        `;

        const historyList = document.getElementById('shop-detail-history-list');
        historyList.innerHTML = '';
        
        const historyData = shop.history || [];
        
        if (historyData.length === 0) {
            historyList.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Keine Historie vorhanden.</p>';
        } else {
            historyData.slice().reverse().forEach(entry => {
                historyList.innerHTML += `
                    <div class="history-item">
                        <div class="history-icon"><i class="fa-solid ${entry.icon}"></i></div>
                        <div class="history-info">
                            <span class="history-text">${entry.text}</span>
                            <span class="history-date">${entry.time}</span>
                        </div>
                    </div>
                `;
            });
        }
    };

    window.closeShopDetailScreen = function() {
        document.getElementById('shop-detail-screen').classList.add('hidden');
        listScreen.classList.remove('hidden');
    };
    // =========================================================
    // --- SELL WORKFLOW: SHOP SELECTION & REVIEW ENGINE ---
    // =========================================================
    
    const shopSelectScreen = document.getElementById('shop-select-screen');
    const sellReviewScreen = document.getElementById('sell-review-screen');
    const sellShopList = document.getElementById('sell-shop-list');
    const btnShopSelectNext = document.getElementById('btn-shop-select-next');
    
    let sellTargetShopId = null; // Speichert den ausgewählten Shop

    // 1. Shop-Auswahl öffnen und rendern
    window.openShopSelectScreen = function() {
        shopSelectScreen.classList.remove('hidden');
        sellTargetShopId = null; // Reset bei jedem neuen Aufruf
        renderShopSelectList();
    };

    window.closeShopSelectScreen = function() {
        shopSelectScreen.classList.add('hidden');
        sellTargetShopId = null;
        
        // Smarter Back-Button: Woher kamen wir?
        if (currentDetailSlideIndex > 0) {
            detailScreen.classList.remove('hidden'); // Kamen direkt vom Block
        } else {
            exchangeScreen.classList.remove('hidden'); // Kamen aus der Block-Auswahl
        }
    };

    function renderShopSelectList() {
        sellShopList.innerHTML = '';
        const db = loadDatabase();
        
        if (!db.shops || db.shops.length === 0) {
            sellShopList.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Keine Shops im System gefunden.</p>';
            btnShopSelectNext.classList.add('disabled');
            btnShopSelectNext.classList.remove('active');
            btnShopSelectNext.disabled = true;
            return;
        }

        // Shops einzeln als klickbare Cards aufbauen
        db.shops.forEach(shop => {
            const isSelected = sellTargetShopId === shop.id;
            const card = document.createElement('div');
            card.className = `live-card exchange-card ${isSelected ? 'selected card-blue' : 'unselected'}`;
            
            const avatarHtml = shop.image 
                ? `<img src="${shop.image}" class="list-avatar" style="width: 45px; height: 45px;">` 
                : `<div class="list-avatar" style="width: 45px; height: 45px;"><i class="fa-solid fa-store" style="color:#666; font-size: 1rem;"></i></div>`;

            card.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%; padding-right: 40px;">
                    ${avatarHtml}
                    <div class="card-info">
                        <div class="card-title">${shop.name}</div>
                    </div>
                </div>
                <i class="fa-solid ${isSelected ? 'fa-circle-check' : 'fa-circle'} exchange-check-icon"></i>
            `;

            // Single Select Logic (es kann immer nur einer grün/blau sein)
            card.addEventListener('click', () => {
                sellTargetShopId = shop.id;
                if (navigator.vibrate) navigator.vibrate(30);
                renderShopSelectList(); // Neu zeichnen, damit die Haken aktualisiert werden
            });

            sellShopList.appendChild(card);
        });

        // Next-Button aktivieren, sobald EIN Shop gewählt wurde
        if (sellTargetShopId) {
            btnShopSelectNext.classList.remove('disabled');
            btnShopSelectNext.classList.add('active');
            btnShopSelectNext.disabled = false;
        } else {
            btnShopSelectNext.classList.add('disabled');
            btnShopSelectNext.classList.remove('active');
            btnShopSelectNext.disabled = true;
        }
    }

    // 2. Von der Shop-Wahl zur finalen Review
    btnShopSelectNext.addEventListener('click', () => {
        if (!sellTargetShopId) return;
        shopSelectScreen.classList.add('hidden');
        openSellReviewScreen();
    });

    // 3. Finale Verkaufs-Zusammenfassung rendern
    window.openSellReviewScreen = function() {
        const db = loadDatabase();
        const shop = db.shops.find(s => s.id === sellTargetShopId);
        const sourceContainer = db.containers[currentDetailIndex];

        // A. Shop Card (Grün, da Ziel)
        const avatarHtml = shop.image 
            ? `<img src="${shop.image}" class="list-avatar" style="width: 50px; height: 50px;">` 
            : `<div class="list-avatar" style="width: 50px; height: 50px;"><i class="fa-solid fa-store" style="color:#666;"></i></div>`;

        document.getElementById('sell-review-shop').innerHTML = `
            <div class="live-card card-green">
                <div style="display: flex; align-items: center; width: 100%;">
                    ${avatarHtml}
                    <div class="card-info">
                        <div class="card-title">${shop.name}</div>
                        <div class="card-detail" style="color: rgba(255,255,255,0.7);">Destination Shop</div>
                    </div>
                </div>
            </div>
        `;

        // B. Source Container Card (Rot, da Quelle)
        document.getElementById('sell-review-from').innerHTML = createFullCardHTML(sourceContainer, 'red', 'sell-from');
        renderReviewQRCode(sourceContainer.id, 'qr-sell-from', false);

        // C. Selected Blocks (Blau, mit Swipe-Carousel falls mehrere)
        const whatContainer = document.getElementById('sell-review-what');
        let carouselHTML = `<div class="block-carousel" id="sell-block-carousel">`;
        let dotsHTML = `<div class="carousel-dots" id="sell-carousel-dots">`;

        tempExchangeBlocks.forEach((block, index) => {
            carouselHTML += `
                <div class="carousel-slide">
                    ${createFullCardHTML(block, 'blue', `sell-what-${index}`)}
                </div>
            `;
            dotsHTML += `<div class="carousel-dot ${index === 0 ? 'active' : ''}"></div>`;
        });

        carouselHTML += `</div>`;
        dotsHTML += `</div>`;
        
        whatContainer.innerHTML = carouselHTML + (tempExchangeBlocks.length > 1 ? dotsHTML : '');

        // D. QR Codes für Blöcke rendern
        tempExchangeBlocks.forEach((block, index) => {
            renderReviewQRCode(block.id, `qr-sell-what-${index}`, true);
        });

        sellReviewScreen.classList.remove('hidden');

        // Carousel Logik aktivieren
        if (tempExchangeBlocks.length > 1) {
            const carousel = document.getElementById('sell-block-carousel');
            const dots = document.querySelectorAll('#sell-carousel-dots .carousel-dot');
            
            carousel.addEventListener('scroll', () => {
                const activeIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
                dots.forEach(d => d.classList.remove('active'));
                if(dots[activeIndex]) dots[activeIndex].classList.add('active');
            });
        }
    };

    window.closeSellReviewScreen = function() {
        sellReviewScreen.classList.add('hidden');
        shopSelectScreen.classList.remove('hidden'); // Zurück zur Shop-Auswahl
    };

// 4. Der finale Sell-Button (Transaktion ausführen)
    document.getElementById('btn-confirm-sell').addEventListener('click', () => {
        const db = loadDatabase();
        const sourceContainer = db.containers[currentDetailIndex];
        const targetShopIndex = db.shops.findIndex(s => s.id === sellTargetShopId);
        const targetShop = db.shops[targetShopIndex];

        if (!sourceContainer || !targetShop) return;

        const blockCount = tempExchangeBlocks.length;
        const blockText = blockCount === 1 ? '1 block' : `${blockCount} blocks`;

        // 1. Blöcke physisch aus dem Container löschen
        const blockIdsToSell = tempExchangeBlocks.map(b => b.id);
        sourceContainer.blocks = sourceContainer.blocks.filter(b => !blockIdsToSell.includes(b.id));

        // 2. Zeitstempel generieren
        const now = new Date();
        const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 3. Container-Historie aktualisieren
        if (!sourceContainer.history) sourceContainer.history = [];
        sourceContainer.history.push({
            icon: 'fa-cart-shopping',
            text: `${blockCount} Blöcke an ${targetShop.name} verkauft`,
            time: timeString
        });

// 4. Shop-Historie aktualisieren
        if (!targetShop.history) targetShop.history = [];
        targetShop.history.push({
            icon: 'fa-box-open',
            text: `${blockCount} Blöcke erhalten (aus ${sourceContainer.name})`,
            time: timeString
        });

        // NEU: Deliveries (Lieferungen) für diesen Shop um +1 erhöhen
        targetShop.deliveries = (targetShop.deliveries || 0) + 1;

 // 5. Globale System-Historie schreiben (inkl. PDF Payload)
        db.globalHistory.push({
            icon: 'fa-handshake',
            title: 'Sale Completed',
            text: `${blockCount} blocks from ${sourceContainer.name} sold to ${targetShop.name}.`,
            time: timeString,
            payload: {
                shop: { ...targetShop }, // Kopie des Shops
                container: { ...sourceContainer, blocks: null }, // Kopie des Containers (ohne Rest-Blöcke, um Platz zu sparen)
                blocks: tempExchangeBlocks.map(b => ({ ...b })) // Exakte Kopie der verkauften Blöcke
            }
        });

        // 6. Alles in die Datenbank brennen
        db.containers[currentDetailIndex] = sourceContainer;
        db.shops[targetShopIndex] = targetShop;
        saveDatabase(db);

        // 7. Puffer leeren
        exchangeSelectedBlocks = [];
        tempExchangeBlocks = [];
        sellTargetShopId = null;
        activeWorkflow = 'exchange';

        // 8. Haptisches Feedback & Screen-Wechsel
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        
        sellReviewScreen.classList.add('hidden');
        document.getElementById('global-history-screen').classList.remove('hidden');
        renderGlobalHistory();

        // 9. Toast Popup anzeigen
        showSuccessToast(`${blockCount} successfully sold to ${targetShop.name}`);
    });

    // --- System UI Functions (Toasts & Global History) ---
    
    function showSuccessToast(message) {
        const toast = document.getElementById('success-toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        // Zwingt den Browser, das Element zu registrieren, bevor die Klasse "show" angewendet wird (für die Animation)
        void toast.offsetWidth; 
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000); // Verschwindet nach 3 Sekunden
    }

    const globalHistoryScreen = document.getElementById('global-history-screen');

    document.getElementById('btn-global-history').addEventListener('click', () => {
        document.getElementById('home-screen').classList.add('hidden');
        globalHistoryScreen.classList.remove('hidden');
        renderGlobalHistory();
    });

    window.closeGlobalHistoryScreen = function() {
        globalHistoryScreen.classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    };

function renderGlobalHistory() {
        const list = document.getElementById('global-history-list');
        list.innerHTML = '';
        const db = loadDatabase();
        
        if (!db.globalHistory || db.globalHistory.length === 0) {
            list.innerHTML = '<p style="color:#888; text-align:center; margin-top:40px;">No history records yet.</p>';
            return;
        }
        
        db.globalHistory.slice().reverse().forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'global-history-entry';
            
            // Wenn der Eintrag Daten für ein PDF hat (Verkauf), mache ihn anklickbar
            if (entry.payload) {
                entryDiv.style.cursor = 'pointer';
                entryDiv.innerHTML = `
                    <div class="icon-box"><i class="fa-solid ${entry.icon}"></i></div>
                    <div class="history-info" style="flex-grow: 1;">
                        <div style="color:#fff; font-weight:600; font-size:1rem; margin-bottom:4px;">${entry.title}</div>
                        <div style="color:#aaa; font-size:0.85rem; margin-bottom:4px;">${entry.text}</div>
                        <div style="color:#666; font-size:0.75rem;">${entry.time}</div>
                    </div>
                    <div style="color: #0055ff; padding-right: 10px;"><i class="fa-solid fa-file-pdf fa-xl"></i></div>
                `;
                // Klick feuert die neue PDF Funktion ab
                entryDiv.addEventListener('click', () => generateSalePDF(entry));
            } else {
                // Normale Einträge ohne PDF
                entryDiv.innerHTML = `
                    <div class="icon-box"><i class="fa-solid ${entry.icon}"></i></div>
                    <div class="history-info">
                        <div style="color:#fff; font-weight:600; font-size:1rem; margin-bottom:4px;">${entry.title}</div>
                        <div style="color:#aaa; font-size:0.85rem; margin-bottom:4px;">${entry.text}</div>
                        <div style="color:#666; font-size:0.75rem;">${entry.time}</div>
                    </div>
                `;
            }
            list.appendChild(entryDiv);
        });
    }

    // --- SALE PDF GENERATOR ---
    window.generateSalePDF = function(entry) {
        showSuccessToast("Lade Dossier..."); // Kurzes Feedback
        
        const payload = entry.payload;
        const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        // Doc-ID im Format: SALE-20260504-A1B2C3
        const docId = `SALE-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${randomHex}`; 
        
        // Preis-Aggregation der Blöcke
        const prices = new Set();
        payload.blocks.forEach(b => { if (b.price) prices.add(b.price); });
        const aggregatedPrices = Array.from(prices).join(' / ') || '-';

        // 1. Die Summary Box
        const summaryBoxHtml = `
            <div style="border: 2px solid #000; padding: 15px; margin-bottom: 25px; border-radius: 8px;">
                <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; border-bottom: 1px solid #000; padding-bottom: 5px;">TRANSACTION SUMMARY</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>FROM:</strong> <span>${payload.container.name}</span></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>TO:</strong> <span>${payload.shop.name}</span></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>WHAT:</strong> <span>${payload.blocks.length} Block(s)</span></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>WHEN:</strong> <span>${entry.time}</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>PRICE TYPE:</strong> <span>${aggregatedPrices}</span></div>
            </div>
        `;

        // 2. Shop Card (Custom, da Shops keine normalen Blöcke sind)
        const shopCardHtml = `
            <div class="pdf-section-title">BUYER (SHOP)</div>
            <div class="pdf-card" style="margin-bottom: 25px;">
                <div class="pdf-card-info" style="width: 100%;">
                    <div class="pdf-card-title">${payload.shop.name}</div>
                    <div class="pdf-card-detail">System ID: ${payload.shop.id}</div>
                    <div class="pdf-card-detail">Registration Date: ${formatPdfDate(payload.shop.date)}</div>
                </div>
            </div>
        `;

        // 3. Container Card (Nutzt deine bestehende Funktion)
        const containerCardHtml = `
            <div class="pdf-section-title">ORIGIN (CONTAINER)</div>
            ${buildPdfCardHtml(payload.container, true, 'hist-c')}
        `;

        // Seite 1 Zusammensetzen
        let pdfHtml = `
            <div class="pdf-page">
                <div class="pdf-header">
                    <div>CREATED: ${entry.time}</div>
                    <div>DOC-ID: ${docId}</div>
                </div>
                <div class="pdf-section-title" style="font-size: 1.4rem; border:none; text-align:center; margin-bottom: 20px;">DELIVERY DOSSIER</div>
                ${summaryBoxHtml}
                ${shopCardHtml}
                ${containerCardHtml}
            </div>
        `;

        // Seite 2: Die verkauften Blöcke
        if (payload.blocks && payload.blocks.length > 0) {
            pdfHtml += `<div class="html2pdf__page-break"></div><div class="pdf-page"><div class="pdf-header"><div>CREATED: ${entry.time}</div><div>DOC-ID: ${docId}</div></div><div class="pdf-section-title">DELIVERED ITEMS IDENTIFICATION</div>`;
            payload.blocks.forEach((block, index) => {
                pdfHtml += `
                    <div class="pdf-block-wrapper">
                        ${buildPdfCardHtml(block, false, `hist-b${index}`)}
                    </div>
                    <div style="margin-bottom: 30px;"></div>
                `;
            });
            pdfHtml += `</div>`;
        }

        // Ins DOM feuern
        const stagingArea = document.getElementById('pdf-export-container');
        stagingArea.innerHTML = pdfHtml;

        // QR Codes aufbauen
        const qrConfig = getQRConfig(false); 
        qrConfig.width = 90; qrConfig.height = 90; qrConfig.margin = 0; qrConfig.backgroundOptions = { color: "#ffffff" };

        // QR für den Origin Container
        qrConfig.data = payload.container.id;
        new QRCodeStyling(qrConfig).append(document.getElementById('pdf-qr-hist-c'));

        // QRs für die Blöcke (Blau)
        payload.blocks.forEach((block, index) => {
            const blockQrConfig = { ...qrConfig, data: block.id, dotsOptions: { color: "#0055ff", type: "square" }, cornersSquareOptions: { color: "#0055ff", type: "square" }, cornersDotOptions: { color: "#0055ff", type: "square" } };
            new QRCodeStyling(blockQrConfig).append(document.getElementById(`pdf-qr-hist-b${index}`));
        });

        // 500ms warten für QRs, dann als PDF rendern und laden
        setTimeout(() => {
            const opt = {
                margin:       0, 
                filename:     `Delivery_${payload.shop.name}_${docId}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'], avoid: '.pdf-block-wrapper' } 
            };

            html2pdf().set(opt).from(stagingArea).save().then(() => {
                stagingArea.innerHTML = '';
            });
        }, 500);
    };
});
