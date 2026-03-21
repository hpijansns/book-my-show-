import { db, ref, onValue, set, update, get, push } from './firebase.js';

// --- Global Utilities ---
const getSessionId = () => {
    let sid = sessionStorage.getItem('sessionId');
    if (!sid) {
        sid = 'sess_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sid);
    }
    return sid;
};
const sessionId = getSessionId();

// --- Formatting ---
const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};
const formatTime = (timeString) => {
    const [h, m] = timeString.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
};

// --- Page routing logic based on DOM elements ---

// 1. INDEX PAGE (Matches)
if (document.getElementById('match-list')) {
    const matchList = document.getElementById('match-list');
    const sortFilter = document.getElementById('sort-filter');
    let matchesData =[];

    const renderMatches = () => {
        matchList.innerHTML = '';
        if(matchesData.length === 0) {
            matchList.innerHTML = '<div class="loading">No matches available.</div>';
            return;
        }

        let sorted = [...matchesData];
        const sortVal = sortFilter.value;
        if(sortVal === 'latest') sorted.sort((a,b) => b.timestamp - a.timestamp);
        if(sortVal === 'price-asc') sorted.sort((a,b) => a.price - b.price);
        if(sortVal === 'price-desc') sorted.sort((a,b) => b.price - a.price);

        sorted.forEach(m => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.onclick = () => window.location.href = `event.html?id=${m.id}`;
            card.innerHTML = `
                <img src="${m.banner || 'https://via.placeholder.com/400x200'}" alt="${m.title}" class="match-banner">
                <div class="match-info">
                    <div class="match-title">${m.title}</div>
                    <div class="match-meta">
                        <span>📅 ${formatDate(m.date)} | ⏰ ${formatTime(m.time)}</span>
                        <span>🏟️ ${m.venue}</span>
                    </div>
                    <div class="match-price">₹ ${m.price} onwards</div>
                </div>
            `;
            matchList.appendChild(card);
        });
    };

    onValue(ref(db, 'matches'), (snapshot) => {
        matchesData =[];
        snapshot.forEach(child => {
            matchesData.push({ id: child.key, ...child.val() });
        });
        renderMatches();
    });

    sortFilter.addEventListener('change', renderMatches);
}

// 2. EVENT PAGE
if (document.getElementById('event-container')) {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');
    const container = document.getElementById('event-container');
    const priceNode = document.getElementById('event-price');
    const bookBtn = document.getElementById('book-now-btn');

    if(!matchId) window.location.href = 'index.html';

    onValue(ref(db, `matches/${matchId}`), (snapshot) => {
        const m = snapshot.val();
        if(!m) {
            container.innerHTML = '<div class="loading">Match not found.</div>';
            return;
        }
        priceNode.innerText = `₹${m.price}`;
        
        container.innerHTML = `
            <div class="event-hero" style="background-image: url('${m.banner}')"></div>
            <div class="event-content">
                <div class="team-vs">
                    <img src="${m.team1Logo}" alt="Team 1" class="team-logo">
                    <div class="vs-badge">VS</div>
                    <img src="${m.team2Logo}" alt="Team 2" class="team-logo">
                </div>
                <h1 class="event-title">${m.title}</h1>
                
                <div class="info-row">
                    <div class="info-icon">📅</div>
                    <div class="info-text">
                        <h4>Date & Time</h4>
                        <p>${formatDate(m.date)} at ${formatTime(m.time)}</p>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-icon">🏟️</div>
                    <div class="info-text">
                        <h4>Venue</h4>
                        <p>${m.venue}</p>
                    </div>
                </div>
            </div>
        `;

        bookBtn.onclick = () => {
            localStorage.setItem('booking_matchId', matchId);
            localStorage.setItem('booking_price', m.price);
            if(window.fbq) fbq('track', 'InitiateCheckout');
            window.location.href = 'seats.html';
        };
    });
}

// 3. SEATS PAGE
if (document.getElementById('seat-map')) {
    const matchId = localStorage.getItem('booking_matchId');
    const matchPrice = parseInt(localStorage.getItem('booking_price') || 0);
    const seatMap = document.getElementById('seat-map');
    const checkoutBar = document.getElementById('checkout-bar');
    const countLabel = document.getElementById('seat-count-label');
    const totalPriceLabel = document.getElementById('total-price');
    const payBtn = document.getElementById('pay-now-btn');
    const LOCK_EXPIRY = 4 * 60 * 1000; // 4 minutes

    if(!matchId) window.location.href = 'index.html';

    // Fetch basic match details for header
    get(ref(db, `matches/${matchId}`)).then(snap => {
        if(snap.exists()) {
            document.getElementById('seat-match-title').innerText = snap.val().title;
            document.getElementById('seat-match-venue').innerText = snap.val().venue;
        }
    });

    let selectedSeatsCount = 0;
    
    // Total 60 seats (6 cols x 10 rows layout via CSS)
    const TOTAL_SEATS = 60;
    
    const renderSeats = (seatsData) => {
        seatMap.innerHTML = '';
        selectedSeatsCount = 0;

        for (let i = 1; i <= TOTAL_SEATS; i++) {
            const seatId = `seat_${i}`;
            const seatNode = document.createElement('div');
            seatNode.className = 'seat';
            
            const seatInfo = seatsData ? seatsData[seatId] : null;
            let status = 'available';
            
            if (seatInfo) {
                if (seatInfo.status === 'booked') {
                    status = 'booked';
                } else if (seatInfo.status === 'locked') {
                    const now = Date.now();
                    // Auto release logic checked on read
                    if (now - seatInfo.timestamp < LOCK_EXPIRY) {
                        status = (seatInfo.user === sessionId) ? 'self-locked' : 'locked';
                    } else {
                        status = 'available'; // Expired lock
                    }
                }
            }

            if (status === 'booked') {
                seatNode.classList.add('booked');
            } else if (status === 'locked') {
                seatNode.classList.add('booked'); // Treat others' locked seats visually similar to booked (unavailable to click)
            } else if (status === 'self-locked') {
                seatNode.classList.add('locked'); // My selected seats (Yellow)
                selectedSeatsCount++;
            } else {
                seatNode.classList.add('available'); // Green
                seatNode.onclick = () => toggleSeat(seatId, 'lock');
            }

            if (status === 'self-locked') {
                seatNode.onclick = () => toggleSeat(seatId, 'unlock');
            }

            seatMap.appendChild(seatNode);
        }

        updateCheckoutBar();
    };

    const toggleSeat = (seatId, action) => {
        if (action === 'lock' && selectedSeatsCount >= 10) {
            alert('You can select a maximum of 10 seats.');
            return;
        }
        
        const updates = {};
        if (action === 'lock') {
            updates[`seats/${matchId}/${seatId}`] = {
                status: 'locked',
                user: sessionId,
                timestamp: Date.now()
            };
            // Pixel event
            const currentTotal = (selectedSeatsCount + 1) * matchPrice;
            if(window.fbq) fbq('track', 'AddToCart', { value: currentTotal, currency: 'INR' });
        } else {
            updates[`seats/${matchId}/${seatId}`] = null; // Free it
        }
        update(ref(db), updates);
    };

    const updateCheckoutBar = () => {
        if (selectedSeatsCount > 0) {
            checkoutBar.style.display = 'flex';
            countLabel.innerText = `${selectedSeatsCount} Seat${selectedSeatsCount > 1 ? 's' : ''}`;
            totalPriceLabel.innerText = `₹${selectedSeatsCount * matchPrice}`;
        } else {
            checkoutBar.style.display = 'none';
        }
    };

    onValue(ref(db, `seats/${matchId}`), (snapshot) => {
        renderSeats(snapshot.val());
    });

    payBtn.onclick = () => {
        const amount = selectedSeatsCount * matchPrice;
        
        // Finalize booking
        get(ref(db, `seats/${matchId}`)).then(snap => {
            const currentSeats = snap.val() || {};
            const updates = {};
            const mySeats =[];
            
            for(let i=1; i<=TOTAL_SEATS; i++) {
                const sid = `seat_${i}`;
                if(currentSeats[sid] && currentSeats[sid].user === sessionId && currentSeats[sid].status === 'locked') {
                    updates[`seats/${matchId}/${sid}`] = { status: 'booked', user: sessionId, timestamp: Date.now() };
                    mySeats.push(sid);
                }
            }
            
            if(mySeats.length > 0) {
                const bookingRef = push(ref(db, 'bookings'));
                updates[`bookings/${bookingRef.key}`] = {
                    matchId: matchId,
                    userId: sessionId,
                    seats: mySeats,
                    amount: amount,
                    timestamp: Date.now()
                };
                
                update(ref(db), updates).then(() => {
                    if(window.fbq) fbq('track', 'Purchase', { value: amount, currency: 'INR' });
                    document.getElementById('success-modal').classList.add('active');
                });
            } else {
                alert("Session expired or no seats selected.");
            }
        });
    };
    
    // Auto refresh local logic periodically to clear expired locks visually
    setInterval(() => {
        get(ref(db, `seats/${matchId}`)).then(snap => { renderSeats(snap.val()); });
    }, 30000); // 30s
}
