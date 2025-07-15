// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs'); // Für Dateisystemzugriff

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const SEGMENTS_FILE = path.join(__dirname, 'segments.json'); // Datei für persistente Segmente

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Standardsegmente (Fallback, falls Datei nicht existiert oder leer ist)
let segments = [
    { text: 'Glück', color: '#FFC107' },
    { text: 'Pech', color: '#607D8B' },
    { text: 'Gewinn', color: '#4CAF50' },
    { text: 'Verloren', color: '#F44336' },
    { text: 'Bonus', color: '#2196F3' },
    { text: 'Nichts', color: '#9E9E9E' },
    { text: 'Jackpot', color: '#E91E63' },
    { text: 'Nochmal', color: '#00BCD4' }
];

// Funktion zum Laden der Segmente aus der Datei
function loadSegments() {
    try {
        if (fs.existsSync(SEGMENTS_FILE)) {
            const data = fs.readFileSync(SEGMENTS_FILE, 'utf8');
            const loadedSegments = JSON.parse(data);
            if (Array.isArray(loadedSegments) && loadedSegments.length > 0) {
                segments = loadedSegments;
                console.log('Segments loaded from file.');
            } else {
                console.log('Segments file is empty or invalid, using default segments.');
            }
        } else {
            console.log('Segments file not found, using default segments.');
            // Speichere die Standardsegmente, wenn die Datei nicht existiert
            saveSegmentsToFile(segments);
        }
    } catch (error) {
        console.error('Error loading segments:', error);
        console.log('Using default segments due to load error.');
    }
}

// Funktion zum Speichern der Segmente in die Datei
function saveSegmentsToFile(newSegments) {
    try {
        fs.writeFileSync(SEGMENTS_FILE, JSON.stringify(newSegments, null, 2), 'utf8');
        console.log('Segments saved to file.');
    } catch (error) {
        console.error('Error saving segments:', error);
        return false;
    }
    return true;
}

// Segmente beim Start des Servers laden
loadSegments();

// Routen für die Hauptseite und die Konfigurationsseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'config.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Senden der aktuellen Segmente an einen neu verbundenen Client
    // Dies geschieht sowohl für index.html als auch für config.html
    socket.emit('segmentsConfig', segments);

    // Wenn ein Client die aktuelle Konfiguration anfordert (speziell für config.html)
    socket.on('requestSegmentsConfig', () => {
        socket.emit('segmentsConfig', segments);
    });

    socket.on('spinWheel', () => {
        console.log('Spin request received');

        // Bestimme ein zufälliges Gewinnsegment
        if (segments.length === 0) {
            console.warn('Cannot spin: No segments defined.');
            return;
        }

        const randomIndex = Math.floor(Math.random() * segments.length);
        const winningSegment = segments[randomIndex];

        // Berechne die Zielrotation für das Gewinnsegment
        const segmentAngle = 360 / segments.length;
        const extraRotations = 5; // Dreht das Rad 5 volle Male
        // Zielposition ist der Mittelpunkt des Gewinnsegments, plus volle Umdrehungen
        const targetRotation = (360 * extraRotations) + (360 - (randomIndex * segmentAngle + segmentAngle / 2));

        console.log(`Winning segment: ${winningSegment.text}, Target Rotation: ${targetRotation} degrees`);

        // Sende das Spin-Event an alle verbundenen Clients
        io.emit('wheelSpun', { targetRotation, winningSegment, randomIndex });
    });

    // Event zum Speichern der Segmente von der Admin-Seite
    socket.on('saveSegments', (newSegments) => {
        if (!Array.isArray(newSegments) || newSegments.length === 0) {
            socket.emit('saveError', 'Ungültige Segmentdaten. Es muss mindestens ein Segment geben.');
            return;
        }
        // Basic validation for segment structure
        const isValid = newSegments.every(s => typeof s.text === 'string' && typeof s.color === 'string' && s.color.match(/^#[0-9a-fA-F]{6}$/));
        if (!isValid) {
            socket.emit('saveError', 'Ungültiges Segmentformat (Text muss String, Farbe Hex-Code sein).');
            return;
        }

        segments = newSegments; // Update the in-memory segments
        const saved = saveSegmentsToFile(segments); // Save to file

        if (saved) {
            // Sende die neuen Segmente an ALLE Clients, damit sich das Rad aktualisiert
            io.emit('segmentsConfig', segments);
            socket.emit('segmentsSaved', 'Segmente erfolgreich gespeichert und aktualisiert!');
            console.log('Segments updated and broadcasted.');
        } else {
            socket.emit('saveError', 'Fehler beim Speichern der Segmente auf dem Server.');
        }
    });


    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
