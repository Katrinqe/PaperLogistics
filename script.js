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
    const hourHand = document.getElementById('hour-hand');
    const minHand = document.getElementById('min-hand');

    function updateClock() {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();

        const hourDeg = (hours * 30) + (minutes * 0.5); // 360 / 12 = 30
        const minDeg = minutes * 6; // 360 / 60 = 6

        hourHand.style.transform = `rotate(${hourDeg}deg)`;
        minHand.style.transform = `rotate(${minDeg}deg)`;
    }

    setInterval(updateClock, 1000);
    updateClock(); // Initialer Aufruf

    // Service Worker Registration für PWA (Zwingend erforderlich für Installation)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registriert'))
            .catch(err => console.error('Service Worker Fehler:', err));
    }
});
