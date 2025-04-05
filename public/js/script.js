const socket = io()
const username = prompt("Enter your username") || "Anonymous";

navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "denied") {
        alert("Please enable location permissions in your browser settings.");
    }
});


if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        socket.emit('send-location', { username, latitude, longitude })
    }, (error) => {
        console.error(error);
    },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0, // no caching
        }
    )

}

const map = L.map('map').setView([0, 0], 16)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "@Sag maps"
}).addTo(map)

// Flag to know when we’ve sent our location
let hasSentOwnLocation = false;
let pendingUsers = null;

function addMarker(id, latitude, longitude, username = "Unknown") {
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        // markers[id] = L.marker([latitude, longitude]).addTo(map);
        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup(`<b>${username}</b>`).openPopup(); 
        markers[id] = marker;
    }
}

const markers = {}

// socket.on("existing-users", (users) => {
//     for (let id in users) {
//         const { latitude, longitude } = users[id];
//         if (id !== socket.id) { // skip your own marker if you're already handling it
//             markers[id] = L.marker([latitude, longitude]).addTo(map);
//         }
//     }
// });

socket.on("existing-users", (users) => {
    if (hasSentOwnLocation) {
        for (let id in users) {
            if (id !== socket.id) {
                const { latitude, longitude, username } = users[id];
                addMarker(id, latitude, longitude, username);
            }
        }
    } else {
        pendingUsers = users;
    }
});


// ✅ 1. First get and send my location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        socket.emit('send-location', { latitude, longitude });

        // Show my own marker
        addMarker(socket.id, latitude, longitude, username);
        map.setView([latitude, longitude]);

        hasSentOwnLocation = true;

        // 🔁 If existing users came in before we sent location, process now
        if (pendingUsers) {
            for (let id in pendingUsers) {
                if (id !== socket.id) {
                    const { latitude, longitude } = pendingUsers[id];
                    addMarker(id, latitude, longitude);
                }
            }
            pendingUsers = null;
        }
    });
}


socket.on("receive-location", (data) => {
    const { id, latitude, longitude, username } = data;
    addMarker(id, latitude, longitude, username);
    map.setView([latitude, longitude])
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude])
    }
    else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }
})

socket.on('user-disconnected', (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id])
        delete markers[id]
    }
})