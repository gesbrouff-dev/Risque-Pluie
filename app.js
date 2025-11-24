const SCHEDULE = {
    1: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Lundi
    2: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Mardi
    3: [{start: 7.5, end: 8.5}, {start: 11.75, end: 12.5}],      // Mercredi
    4: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Jeudi
    5: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Vendredi
    6: [{start: 13.5, end: 14}, {start: 15, end: 15.5}]          // Samedi
};

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

let weatherData = null;

window.onload = function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000,
        });
    } else {
        showError("⚠️ Votre navigateur ne supporte pas la géolocalisation.");
    }
};

function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const messageElement = document.getElementById("message");
    messageElement.style.display = 'none';

    const weatherUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;

    fetch(weatherUrl)
        .then(res => {
            if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
            return res.json();
        })
        .then(data => {
            weatherData = data;
            analyzeWeatherForMoto();
        })
        .catch(err => {
            showError(`⚠️ Erreur: ${err.message}`);
        });
}

function analyzeWeatherForMoto() {
    const messageElement = document.getElementById("message");
    const forecastContainer = document.getElementById("forecastContainer");
    const detailsContainer = document.getElementById("detailsContainer");
    
    let overallRisk = 0;
    let dayResults = {};
    let allSlots = [];

    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
        const targetDay = new Date();
        targetDay.setDate(targetDay.getDate() + dayOffset);
        const dayOfWeek = targetDay.getDay();

        if (!SCHEDULE[dayOfWeek]) continue;

        const dayKey = DAYS[dayOfWeek];
        dayResults[dayKey] = {
            date: new Date(targetDay),
            slots: [],
            dayRisk: 0,
            betweenSlotsRain: null
        };

        SCHEDULE[dayOfWeek].forEach(slot => {
            const slotData = checkTimeSlot(targetDay, slot.start, slot.end);
            dayResults[dayKey].slots.push(slotData);
            allSlots.push(slotData);
            dayResults[dayKey].dayRisk = Math.max(dayResults[dayKey].dayRisk, slotData.risk);
            overallRisk = Math.max(overallRisk, slotData.risk);
        });

        // Vérifier la pluie entre les créneaux
        const slots = SCHEDULE[dayOfWeek];
        if (slots.length > 1) {
            const firstSlotStart = slots[0].start;
            const lastSlotEnd = slots[slots.length - 1].end;
            dayResults[dayKey].betweenSlotsRain = checkBetweenSlots(targetDay, firstSlotStart, lastSlotEnd);
        }
    }

    // Afficher les prévisions par jour
    forecastContainer.innerHTML = '';
    Object.entries(dayResults).forEach(([day, results]) => {
        if (results.slots.length > 0) {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            
            // Formater la date complète
            const formattedDate = results.date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            card.innerHTML = `<h4>${formattedDate}</h4>`;
            
            results.slots.forEach(slot => {
                const statusClass = getSlotStatusClass(slot.risk);
                const timeStr = `${Math.floor(slot.start)}:${String(Math.round((slot.start % 1) * 60)).padStart(2, '0')} - ${Math.floor(slot.end)}:${String(Math.round((slot.end % 1) * 60)).padStart(2, '0')}`;
                
                let slotDetail = '';
                if (slot.risk > 0) {
                    slotDetail = `<div style="font-size: 0.85em; color: #666; margin-top: 5px;">Pluie: ${slot.rain.toFixed(2)} mm/h | Temp: ${slot.temp.toFixed(1)}°C</div>`;
                }
                
                card.innerHTML += `
                    <div class="time-slot">
                        <div style="flex-grow: 1;">
                            <div><span>${timeStr}</span> <span class="${statusClass}">${getSlotStatus(slot.risk)}</span></div>
                            ${slotDetail}
                        </div>
                    </div>
                `;
            });

            // Afficher info pluie entre les créneaux si présente
            if (results.betweenSlotsRain && results.betweenSlotsRain.hasRain) {
                card.innerHTML += `
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 0.9em; border-left: 3px solid #ffc107;">
                        💧 Pluie entre les créneaux: ${results.betweenSlotsRain.maxRain.toFixed(2)} mm/h
                    </div>
                `;
            }
            
            forecastContainer.appendChild(card);
        }
    });

    // Afficher les détails
    if (allSlots.length > 0) {
        detailsContainer.style.display = 'none';
    }
}

function checkBetweenSlots(date, startHour, endHour) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    
    const slotEnd = new Date(date);
    slotEnd.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);

    const slotData = weatherData.properties.timeseries.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate >= slotStart && itemDate <= slotEnd;
    });

    let maxRain = 0;

    slotData.forEach(item => {
        const rain = item.data.next_1_hours?.details?.precipitation_amount ?? 0;
        maxRain = Math.max(maxRain, rain);
    });

    return {
        maxRain: maxRain,
        hasRain: maxRain > 0.01
    };
}

function checkTimeSlot(date, startHour, endHour) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    
    const slotEnd = new Date(date);
    slotEnd.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);

    const slotData = weatherData.properties.timeseries.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate >= slotStart && itemDate <= slotEnd;
    });

    let maxRain = 0;
    let maxIcing = 0;
    let avgTemp = 0;
    let count = 0;

    slotData.forEach(item => {
        const rain = item.data.next_1_hours?.details?.precipitation_amount ?? 0;
        maxRain = Math.max(maxRain, rain);
        
        const temp = item.data.instant.details.air_temperature;
        avgTemp += temp;
        count++;

        if (temp <= 3 && rain > 0) {
            maxIcing = Math.max(maxIcing, rain);
        }
    });

    avgTemp = count > 0 ? avgTemp / count : 0;

    let risk = 0;
    if (maxRain > 0.1 || maxIcing > 0) risk = 2;
    else if (maxRain > 0.01) risk = 1;

    return {
        start: startHour,
        end: endHour,
        rain: maxRain,
        icing: maxIcing,
        temp: avgTemp,
        risk: risk
    };
}

function getSlotStatus(risk) {
    if (risk === 0) return '✅ OK';
    if (risk === 1) return '⚠️ Attention';
    if (risk === 2) return '🚫 Non';
    return '❓ ?';
}

function getSlotStatusClass(risk) {
    if (risk === 0) return 'slot-ok';
    if (risk === 1) return 'slot-warning';
    if (risk === 2) return 'slot-danger';
    return 'slot-unknown';
}

function showError(msg) {
    const messageElement = document.getElementById("message");
    messageElement.className = 'status-danger';
    messageElement.textContent = msg;
    messageElement.style.display = 'block';
}

function error(err) {
    let errorMessage = "⚠️ Erreur inconnue.";
    switch (err.code) {
        case 1:
            errorMessage = "⚠️ Localisation refusée. Activez-la dans les réglages.";
            break;
        case 2:
            errorMessage = "⚠️ Position indisponible. Vérifiez votre GPS.";
            break;
        case 3:
            errorMessage = "⚠️ Temps d'attente dépassé. Réessayez.";
            break;
    }
    showError(errorMessage);
}
