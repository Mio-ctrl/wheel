        // public/script.js Inhalt hier
        const socket = io();
        const wheel = document.getElementById('wheel');
        const spinButton = document.getElementById('spinButton');
        const statusMessage = document.getElementById('statusMessage');

        let segments = [];
        let spinning = false;

        // Funktion zum Zeichnen der Radsegmente
        function drawWheel(segmentsConfig) {
            segments = segmentsConfig;
            wheel.innerHTML = ''; // Vorhandene Segmente löschen
            const numSegments = segments.length;
            const segmentAngle = 360 / numSegments; // Winkel jedes Segments

            segments.forEach((segment, index) => {
                const segmentElement = document.createElement('div');
                segmentElement.classList.add('wheel-segment');
                segmentElement.style.backgroundColor = segment.color;

                // Rotieren und Scheren, um einen Keil zu bilden
                // Der Winkel `segmentAngle * index` dreht das Segment an die richtige Position
                // `skewY(90 - segmentAngle)` macht den Keil.
                segmentElement.style.transform = `rotate(${segmentAngle * index}deg) skewY(${90 - segmentAngle}deg)`;

                const segmentContent = document.createElement('div');
                segmentContent.classList.add('segment-content');
                segmentContent.textContent = segment.text;

                // Textausrichtung innerhalb des Keils
                // Die Rotation des Textes muss den Keil-Effekt aufheben und den Text lesbar ausrichten.
                // Der Mittelpunkt des Segments ist (segmentAngle / 2) innerhalb des Segments
                // Plus die 90 Grad, um horizontal zu liegen, minus den Skew-Winkel, um ihn aufzuheben
                const textRotation = segmentAngle / 2 + 90 + (90 - segmentAngle); // Angepasster Winkel für Text
                segmentContent.style.transform = `rotate(${textRotation}deg)`;


                segmentElement.appendChild(segmentContent);
                wheel.appendChild(segmentElement);
            });
        }

        // Anfängliche Segmentkonfiguration vom Server
        socket.on('segmentsConfig', (config) => {
            segments = config;
            drawWheel(segments);
        });


        spinButton.addEventListener('click', () => {
            if (!spinning) {
                socket.emit('spinWheel');
                spinButton.disabled = true;
                statusMessage.textContent = 'Warte auf Drehung...';
            }
        });

        socket.on('wheelSpun', (data) => {
            const { targetRotation, winningSegment, randomIndex } = data;
            console.log(`Spin-Daten empfangen: Zielrotation ${targetRotation}, Gewinnsegment: ${winningSegment.text}`);

            spinning = true;
            wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Transition anwenden
            wheel.style.transform = `rotate(${targetRotation}deg)`;

            // Auf das Ende der Transition warten
            wheel.addEventListener('transitionend', () => {
                spinning = false;
                spinButton.disabled = false;
                statusMessage.textContent = `Gewinner: ${winningSegment.text}`;

                // Transformation zurücksetzen, um große Rotationswerte zu vermeiden
                const currentRotation = targetRotation % 360;
                wheel.style.transition = 'none'; // Temporär Transition entfernen
                wheel.style.transform = `rotate(${currentRotation}deg)`; // Auf die tatsächliche visuelle Position zurücksetzen

                // Einen Reflow erzwingen, um sicherzustellen, dass die Transition vor dem nächsten Spin zurückgesetzt wird
                void wheel.offsetWidth;
            }, { once: true }); // { once: true } verwenden, um sicherzustellen, dass der Event-Listener nach dem Auslösen entfernt wird
        });
