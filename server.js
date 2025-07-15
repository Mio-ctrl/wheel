// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Wheel segments configuration (can be customized)
const segments = [
    { text: 'Glück', color: '#FFC107' },
    { text: 'Pech', color: '#607D8B' },
    { text: 'Gewinn', color: '#4CAF50' },
    { text: 'Verloren', color: '#F44336' },
    { text: 'Bonus', color: '#2196F3' },
    { text: 'Nichts', color: '#9E9E9E' },
    { text: 'Jackpot', color: '#E91E63' },
    { text: 'Nochmal', color: '#00BCD4' }
];

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send segments configuration to the newly connected client
    socket.emit('segmentsConfig', segments);

    socket.on('spinWheel', () => {
        console.log('Spin request received');

        // Determine a random winning segment
        const randomIndex = Math.floor(Math.random() * segments.length);
        const winningSegment = segments[randomIndex];

        // Calculate the target rotation for the winning segment
        // This is a simplified calculation. For more precision, consider the exact angle of each segment.
        const segmentAngle = 360 / segments.length;
        // Add full rotations to make the wheel spin multiple times
        const extraRotations = 5; // Spin 5 full times
        const targetRotation = (360 * extraRotations) + (360 - (randomIndex * segmentAngle + segmentAngle / 2));

        console.log(`Winning segment: ${winningSegment.text}, Target Rotation: ${targetRotation} degrees`);

        // Emit the spin event to all connected clients
        io.emit('wheelSpun', { targetRotation, winningSegment, randomIndex });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
