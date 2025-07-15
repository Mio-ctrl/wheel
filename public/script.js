// public/script.js
const socket = io();
const wheel = document.getElementById('wheel');
const spinButton = document.getElementById('spinButton');
const statusMessage = document.getElementById('statusMessage');

let segments = [];
let spinning = false;

// Function to draw the wheel segments
function drawWheel(segmentsConfig) {
    segments = segmentsConfig;
    wheel.innerHTML = ''; // Clear existing segments
    const numSegments = segments.length;
    const segmentAngle = 360 / numSegments;

    segments.forEach((segment, index) => {
        const segmentElement = document.createElement('div');
        segmentElement.classList.add('wheel-segment');
        segmentElement.style.backgroundColor = segment.color;
        segmentElement.style.transform = `rotate(${index * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`;

        const segmentContent = document.createElement('div');
        segmentContent.classList.add('segment-content');
        segmentContent.style.transform = `rotate(${segmentAngle / 2}deg) skewY(${90 - segmentAngle}deg)`; // Adjust for text orientation
        segmentContent.textContent = segment.text;

        // Positioning for text, needs to be adjusted based on number of segments and desired look
        if (numSegments === 8) {
             // For 8 segments, rotate text to be readable
            segmentContent.style.transform = `rotate(${segmentAngle / 2 + 90}deg) skewY(${90 - segmentAngle}deg)`;
            segmentContent.style.left = '50%';
            segmentContent.style.top = '25%';
            segmentContent.style.transformOrigin = '0% 0%';
            segmentContent.style.width = '100%';
            segmentContent.style.height = '100%';
            segmentContent.style.display = 'flex';
            segmentContent.style.alignItems = 'center';
            segmentContent.style.justifyContent = 'center';
            segmentContent.style.padding = '0';
        }


        segmentElement.appendChild(segmentContent);
        wheel.appendChild(segmentElement);
    });
}

// Initial segments configuration from server
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
    console.log(`Received spin data: Target Rotation ${targetRotation}, Winning Segment: ${winningSegment.text}`);

    spinning = true;
    wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Apply transition
    wheel.style.transform = `rotate(${targetRotation}deg)`;

    // Listen for the end of the transition
    wheel.addEventListener('transitionend', () => {
        spinning = false;
        spinButton.disabled = false;
        statusMessage.textContent = `Gewinner: ${winningSegment.text}`;

        // Reset the transform to avoid accumulating large rotation values
        // This makes sure the next spin starts from a clean slate relative to the current position
        const currentRotation = targetRotation % 360;
        wheel.style.transition = 'none'; // Temporarily remove transition
        wheel.style.transform = `rotate(${currentRotation}deg)`; // Reset to actual visual position

        // Force a reflow to ensure the transition is reset before the next spin
        void wheel.offsetWidth;
    }, { once: true }); // Use { once: true } to ensure the event listener is removed after it fires
});
