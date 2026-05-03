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
       const db = data ? JSON.parse(data) : { containers: [], shops: [] };
        if (!db.shops) db.shops = []; // Sicherheits-Patch für bestehende DBs
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

            db.shops.forEach((shop) => {
                let displayDate = shop.date || '-';
                if (displayDate && displayDate.includes('-')) {
                    const parts = displayDate.split('-');
                    displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }

                const shopItem = document.createElement('div');
                shopItem.className = 'live-card'; 
                
                const avatarHtml = shop.image 
                    ? `<img src="${shop.image}" class="list-avatar">` 
                    : `<div class="list-avatar"><i class="fa-solid fa-store" style="color:#666;"></i></div>`;

                shopItem.innerHTML = `
                    <div style="display: flex; align-items: center; width: 100%;">
                        ${avatarHtml}
                        <div class="card-info">
                            <div class="card-title">${shop.name}</div>
                            <div class="card-detail">Added: ${displayDate}</div>
                            <div class="card-detail" style="color: #0055ff;">0 Deliveries</div>
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
    // --- Edit & Delete Actions ---
    const deletePopup = document.getElementById('delete-popup');

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

// LÖSCHEN POPUP ÖFFNEN
    document.getElementById('btn-delete-container').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        const titleEl = document.querySelector('#delete-popup .popup-title');
        
        // Dynamischer Text im Popup, damit du weißt, was genau gelöscht wird
        if (currentDetailSlideIndex > 0) {
            const blockName = container.blocks[currentDetailSlideIndex - 1].name;
            if (titleEl) titleEl.textContent = `Block "${blockName}" löschen?`;
        } else {
            if (titleEl) titleEl.textContent = `Container "${container.name}" löschen?`;
        }
        
        deletePopup.classList.remove('hidden');
    });

    // LÖSCHEN ABBRECHEN (No)
    document.getElementById('btn-popup-no').addEventListener('click', () => {
        deletePopup.classList.add('hidden');
    });

    // LÖSCHEN BESTÄTIGEN (Yes)
    document.getElementById('btn-popup-yes').addEventListener('click', () => {
        const db = loadDatabase();
        
        if (currentDetailSlideIndex > 0) {
            // --- BLOCK LÖSCHEN ---
            const container = db.containers[currentDetailIndex];
            const blockIndex = currentDetailSlideIndex - 1;
            const blockName = container.blocks[blockIndex].name;
            
            // 1. Block physisch aus dem Array entfernen
            container.blocks.splice(blockIndex, 1);
            
            // 2. Den Löschvorgang in die Historie des Containers schreiben!
            const now = new Date();
            const timeString = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (!container.history) container.history = [];
            container.history.push({
                icon: 'fa-trash',
                text: `Block "${blockName}" gelöscht`,
                time: timeString
            });
            
            db.containers[currentDetailIndex] = container;
            saveDatabase(db);
            
            deletePopup.classList.add('hidden');
            
            // 3. Ansicht neu laden und sicherheitshalber auf den Container (Slide 0) zurückspringen
            openDetailScreen(currentDetailIndex, 0); 
            
        } else {
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

    // Hilfsfunktion: Promise-basierter, kugelsicherer Cleanup
    // ... (stopScanner Funktion unverändert lassen) ...

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
    }

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
    document.getElementById('btn-exchange').addEventListener('click', () => {
        const db = loadDatabase();
        const container = db.containers[currentDetailIndex];
        
        if (!container.blocks || container.blocks.length === 0) {
            alert('Dieser Container ist leer.'); return;
        }

        if (currentDetailSlideIndex > 0) {
            // BLOCK MODUS (Direktflug zum Scanner)
            const block = container.blocks[currentDetailSlideIndex - 1];
            exchangeSelectedBlocks = [block.id];
            tempExchangeBlocks = [{ ...block }]; // Puffer für Namenskonflikte laden
            
            scanMode = 'exchange';
            detailScreen.classList.add('hidden');
            startScannerAction(); // Scanner direkt öffnen!
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

    // 1. Target Button kicken
    document.getElementById('btn-exchange-target').addEventListener('click', () => {
        if (exchangeSelectedBlocks.length === 0) return;

        const db = loadDatabase();
        const sourceContainer = db.containers[currentDetailIndex];

        // Deep-Copy der ausgewählten Blöcke in den Puffer, damit wir sie gefahrlos temporär umbenennen können
        tempExchangeBlocks = sourceContainer.blocks
            .filter(b => exchangeSelectedBlocks.includes(b.id))
            .map(b => ({ ...b })); 

        scanMode = 'exchange';
        exchangeScreen.classList.add('hidden');
        startScannerAction(); // Wirft den Scanner explizit im Exchange-Modus an
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

    // 6. Review Screen rendern
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
        // (Wir behalten nur die Blöcke, deren IDs NICHT im Auswahl-Array stehen)
        sourceContainer.blocks = sourceContainer.blocks.filter(b => !exchangeSelectedBlocks.includes(b.id));

        // 2. Blöcke ins Ziel einfügen
        // (Wir nutzen tempExchangeBlocks, da hier bereits alle Namenskonflikte gelöst wurden!)
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
            // Wenn der Block noch eine "leere Akte" hatte, speichern wir das Erstellungsdatum nachträglich hart ab
            if (!block.history) {
                // Wir nutzen die alte formatDisplayDate Logik für das Fallback-Datum
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
            
            // Jetzt den neuen Transfer-Eintrag anhängen
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

        // 5. Erfolgs-Feedback (App-Feeling: kurz-lang-kurz Vibration)
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

        // 6. Aufräumen der Puffer
        exchangeSelectedBlocks = [];
        tempExchangeBlocks = [];
        scanMode = 'default';

        // 7. Screens wechseln und UI aktualisieren
        document.getElementById('review-exchange-screen').classList.add('hidden');
        
        // Lädt die Detail-Ansicht des Quell-Containers hart neu. 
        // -> Die Live-Card aggregiert sich neu, die Blöcke sind weg, die Historie zeigt den neuen Eintrag.
        openDetailScreen(currentDetailIndex); 
    });
    // --- PDF Export Logic ---

    // Helfer: Datum formatieren
    function formatPdfDate(dateStr) {
        let displayDate = dateStr || '-';
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return displayDate;
    }

    // Helfer: Aggregation für die PDF-Card
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

    // Helfer: HTML für die Print-Card bauen
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

    // Helfer: HTML für die Print-Historie bauen
    function buildPdfHistoryHtml(historyArray) {
        if (!historyArray || historyArray.length === 0) return '<p style="color:#888;">Keine Historie vorhanden.</p>';
        
        let html = `<div class="pdf-history-list">`;
        // Wir iterieren umgedreht, neueste Aktion oben
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

        // Eindeutige Document-ID und Zeitstempel generieren
        const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        const docId = `DOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${randomHex}`;
        
        const now = new Date();
        const printTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let pdfHtml = '';

        if (currentDetailSlideIndex > 0) {
            // BLOCK MODUS (Nur eine Seite für genau diesen Block)
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
            // CONTAINER MODUS (Alles wie gehabt)
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

        // QR Codes bedingt rendern
        const qrConfig = getQRConfig(false); 
        qrConfig.width = 90; qrConfig.height = 90; qrConfig.margin = 0; qrConfig.backgroundOptions = { color: "#ffffff" };

        if (currentDetailSlideIndex > 0) {
            // Nur den einen blauen Block-QR zeichnen
            const blockQrConfig = { ...qrConfig, data: container.blocks[currentDetailSlideIndex - 1].id, dotsOptions: { color: "#0055ff", type: "square" }, cornersSquareOptions: { color: "#0055ff", type: "square" }, cornersDotOptions: { color: "#0055ff", type: "square" } };
            new QRCodeStyling(blockQrConfig).append(document.getElementById('pdf-qr-b0'));
        } else {
            // Alle QRs zeichnen (Container)
            qrConfig.data = container.id;
            new QRCodeStyling(qrConfig).append(document.getElementById('pdf-qr-c'));
            if (container.blocks) {
                container.blocks.forEach((block, index) => {
                    const blockQrConfig = { ...qrConfig, data: block.id, dotsOptions: { color: "#0055ff", type: "square" }, cornersSquareOptions: { color: "#0055ff", type: "square" }, cornersDotOptions: { color: "#0055ff", type: "square" } };
                    new QRCodeStyling(blockQrConfig).append(document.getElementById(`pdf-qr-b${index}`));
                });
            }
        }

  // --- PDF ENGINE STARTEN ---
        // Kurzes visuelles Feedback für dich, dass der Prozess läuft
        const originalBtnColor = document.getElementById('btn-export-pdf').style.backgroundColor;
        document.getElementById('btn-export-pdf').style.backgroundColor = '#00C851';

        // WICHTIG: Wir zwingen die Engine 500ms zu warten, damit die QR-Codes fertig gerendert sind
        setTimeout(() => {
const opt = {
                margin:       0, 
                filename:     `${container.name}_Dossier_${docId}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                // Zwingt die Engine, die Blöcke als unteilbare Elemente zu behandeln
                pagebreak:    { mode: ['css', 'legacy'], avoid: '.pdf-block-wrapper' } 
            };

            // Konvertierung ausführen und Herunterladen
            html2pdf().set(opt).from(stagingArea).save().then(() => {
                // Aufräumen und Button zurücksetzen
                stagingArea.innerHTML = '';
                document.getElementById('btn-export-pdf').style.backgroundColor = originalBtnColor;
            });
        }, 500);
    });
    // --- New Shop Engine ---
    const newShopScreen = document.getElementById('new-shop-screen');
    const shopAvatarInput = document.getElementById('shop-avatar-input');
    const shopAvatarPreview = document.getElementById('shop-avatar-preview');
    let tempShopImageBase64 = null;

    // Öffnet den Screen (Bitte checke, ob 'btn-add-shop' der richtige ID-Name deines Buttons auf dem Home Screen ist!)
    document.getElementById('btn-add-shop').addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        newShopScreen.classList.remove('hidden');
        
        // Formular resetten
        document.getElementById('shop-name-input').value = '';
        shopAvatarPreview.src = '';
        shopAvatarPreview.classList.add('hidden');
        tempShopImageBase64 = null;
    });

    window.closeNewShopScreen = function() {
        newShopScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    };

    // Klick auf das Profilbild öffnet den Datei-Dialog
    document.getElementById('btn-shop-avatar').addEventListener('click', () => {
        shopAvatarInput.click();
    });

    // Bild wird ausgewählt, komprimiert und als Base64 gespeichert
    shopAvatarInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Komprimierung über Canvas (Schützt die Datenbank vor Abstürzen)
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 300; // Profilbilder brauchen nicht mehr als 300x300 Pixel
                
                canvas.width = size;
                canvas.height = size;
                
                // Zentrierter Crop (Quadratischer Ausschnitt)
                const minSide = Math.min(img.width, img.height);
                const startX = (img.width - minSide) / 2;
                const startY = (img.height - minSide) / 2;
                
                ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, size, size);
                
                tempShopImageBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% Qualität reicht völlig
                
                // Vorschau anzeigen
                shopAvatarPreview.src = tempShopImageBase64;
                shopAvatarPreview.classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Shop Speichern
    document.getElementById('btn-confirm-shop').addEventListener('click', () => {
        const shopName = document.getElementById('shop-name-input').value.trim();
        
        // Zwangseingabe (Wie besprochen: Keine Vorwahl, muss manuell eingegeben werden)
        if (!shopName) {
            alert("Bitte gib einen Namen für den Shop ein.");
            return;
        }

        const db = loadDatabase();
        
        // Check auf Namens-Duplikate bei Shops
        if (db.shops.some(s => s.name.toLowerCase() === shopName.toLowerCase())) {
            alert("Ein Shop mit diesem Namen existiert bereits!");
            return;
        }

        const newShop = {
            id: generateUUID('S'),
            name: shopName,
            image: tempShopImageBase64,
            date: new Date().toISOString().split('T')[0]
        };

        db.shops.push(newShop);
        saveDatabase(db);
        
        // UI aufräumen und zur Shop-Liste springen
        newShopScreen.classList.add('hidden');
        listScreen.classList.remove('hidden');
        switchListTab('shops'); // Wechselt automatisch den Tab oben auf "Shops"
    });
});
