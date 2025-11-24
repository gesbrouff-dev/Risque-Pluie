<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏍️ Vérificateur Météo Moto</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            transition: background-color 0.3s;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 30px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 0.95em;
        }
        #message {
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            font-size: 1.1em;
            line-height: 1.6;
            text-align: center;
        }
        .status-ok {
            background-color: #d4edda;
            border: 2px solid #28a745;
            color: #155724;
        }
        .status-warning {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            color: #856404;
        }
        .status-danger {
            background-color: #f8d7da;
            border: 2px solid #dc3545;
            color: #721c24;
        }
        .status-loading {
            background-color: #d1ecf1;
            border: 2px solid #0c5460;
            color: #0c5460;
        }
        .schedule {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .schedule h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .day-schedule {
            margin-bottom: 12px;
            padding: 10px;
            background: white;
            border-left: 4px solid #667eea;
            border-radius: 5px;
        }
        .day-schedule strong {
            color: #667eea;
        }
        .day-schedule span {
            color: #666;
            font-size: 0.95em;
        }
        .forecast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .forecast-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            border-left: 4px solid #667eea;
        }
        .forecast-card h4 {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        .time-slot {
            margin-bottom: 8px;
            padding: 8px;
            background: white;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9em;
        }
        .slot-ok { color: #28a745; font-weight: bold; }
        .slot-warning { color: #ffc107; font-weight: bold; }
        .slot-danger { color: #dc3545; font-weight: bold; }
        .slot-unknown { color: #999; font-style: italic; }
        .details {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        .details h3 {
            color: #333;
            margin-bottom: 15px;
        }
        .detail-item {
            padding: 10px;
            margin-bottom: 10px;
            background: white;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
        }
        .detail-label {
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Peux-tu prendre ta moto?</h1>
        <p class="subtitle">Vérification en temps réel des conditions météo pour tes trajets</p>
        
        <div id="message" class="status-loading">Chargement en cours...</div>
        
        <div class="schedule">
            <h3>📅 Tes trajets à vérifier</h3>
            <div class="day-schedule">
                <strong>Lundi - Vendredi</strong>
                <span>07:30 - 08:30 (matin) · 16:45 - 17:30 (soir)</span>
            </div>
            <div class="day-schedule">
                <strong>Mercredi</strong>
                <span>07:30 - 08:30 (matin) · 11:45 - 12:30 (midi) · 16:45 - 17:30 (soir)</span>
            </div>
            <div class="day-schedule">
                <strong>Samedi</strong>
                <span>13:30 - 14:00 · 15:00 - 15:30</span>
            </div>
        </div>

        <div id="forecastContainer" class="forecast-grid"></div>
        <div id="detailsContainer" class="details" style="display:none;"></div>
    </div>

    <script>
        const SCHEDULE = {
            1: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Lundi
            2: [{start: 7.5, end: 8.5}, {start: 16.75, end: 17.5}],      // Mardi
            3: [{start: 7.5, end: 8.5}, {start: 11.75, end: 12.5}, {start: 16.75, end: 17.5}], // Mercredi
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
            messageElement.textContent = "Récupération des données météo...";

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
                    slots: [],
                    dayRisk: 0
                };

                SCHEDULE[dayOfWeek].forEach(slot => {
                    const slotData = checkTimeSlot(targetDay, slot.start, slot.end);
                    dayResults[dayKey].slots.push(slotData);
                    allSlots.push(slotData);
                    dayResults[dayKey].dayRisk = Math.max(dayResults[dayKey].dayRisk, slotData.risk);
                    overallRisk = Math.max(overallRisk, slotData.risk);
                });
            }

            // Afficher les résultats
            let statusClass = 'status-ok';
            let statusText = '✅ OUI! Tu peux prendre ta moto! 🎉';
            
            if (overallRisk === 1) {
                statusClass = 'status-warning';
                statusText = '⚠️ VIGILANCE - Conditions dégradées. À voir à l\'oeil.';
            } else if (overallRisk === 2) {
                statusClass = 'status-danger';
                statusText = '🚫 NON - Risques importants. Pas recommandé.';
            }

            messageElement.className = statusClass;
            messageElement.innerHTML = `<strong>${statusText}</strong>`;

            // Afficher les prévisions par jour
            forecastContainer.innerHTML = '';
            Object.entries(dayResults).forEach(([day, results]) => {
                if (results.slots.length > 0) {
                    const card = document.createElement('div');
                    card.className = 'forecast-card';
                    card.innerHTML = `<h4>${day}</h4>`;
                    
                    results.slots.forEach(slot => {
                        const statusClass = getSlotStatusClass(slot.risk);
                        const timeStr = `${Math.floor(slot.start)}:${String(Math.round((slot.start % 1) * 60)).padStart(2, '0')} - ${Math.floor(slot.end)}:${String(Math.round((slot.end % 1) * 60)).padStart(2, '0')}`;
                        card.innerHTML += `
                            <div class="time-slot">
                                <span>${timeStr}</span>
                                <span class="${statusClass}">${getSlotStatus(slot.risk)}</span>
                            </div>
                        `;
                    });
                    
                    forecastContainer.appendChild(card);
                }
            });

            // Afficher les détails
            if (allSlots.length > 0) {
                detailsContainer.style.display = 'block';
                const avgRain = (allSlots.reduce((sum, s) => sum + s.rain, 0) / allSlots.length).toFixed(1);
                const avgTemp = (allSlots.reduce((sum, s) => sum + s.temp, 0) / allSlots.length).toFixed(1);
                
                detailsContainer.innerHTML = `
                    <h3>📊 Moyennes sur tes trajets</h3>
                    <div class="detail-item">
                        <span class="detail-label">Température moyenne:</span>
                        <span>${avgTemp}°C</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pluie moyenne:</span>
                        <span>${avgRain} mm/h</span>
                    </div>
                `;
            }
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

                if (temp <= 2 && rain > 0) {
                    maxIcing = Math.max(maxIcing, rain);
                }
            });

            avgTemp = count > 0 ? avgTemp / count : 0;

            let risk = 0;
            if (maxRain > 0.5 || maxIcing > 0) risk = 2;
            else if (maxRain > 0.1) risk = 1;

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
    </script>
</body>
</html>
