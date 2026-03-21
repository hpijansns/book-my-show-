import { db, ref, onValue, set, update, get, push } from './firebase.js';

// --- Session Logic ---
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
const formatTime = (timeString) => {
    const[h, m] = timeString.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
};
const formatDateFull = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// ---------------------------------------------
// 1. INDEX PAGE
// ---------------------------------------------
if (document.getElementById('match-list')) {
    const matchList = document.getElementById('match-list');
    const sortFilter = document.getElementById('sort-filter');
    const eventCountTitle = document.getElementById('event-count-title');
    let matchesData =[];

    const renderMatches = () => {
        matchList.innerHTML = '';
        if(matchesData.length === 0) {
            matchList.innerHTML = '<div class="loading">No matches available. Add from Admin.</div>';
            eventCountTitle.innerText = "0 Events";
            return;
        }

        let sorted = [...matchesData];
        if(sortFilter.value === 'latest') sorted.sort((a,b) => b.timestamp - a.timestamp);
        if(sortFilter.value === 'price-asc') sorted.sort((a,b) => a.price - b.price);

        eventCountTitle.innerText = `${sorted.length} Events`;

        sorted.forEach((m, index) => {
            const d = new Date(m.date);
            const dVal = d.toLocaleDateString('en-GB', { day: '2-digit' });
            const mVal = d.toLocaleDateString('en-GB', { month: 'short' });
            const dayStr = d.toLocaleDateString('en-GB', { weekday: 'short' });
            
            let city = 'City';
            let stadiumName = m.venue;
            if(m.venue.includes(':')) {
                const parts = m.venue.split(':');
                stadiumName = parts[0].trim();
                city = parts[1].trim();
            }
            if (city.length > 8) city = city.substring(0, 7) + '..';
            
            const teams = m.title.split(/vs/i);
            const t1 = teams[0]?.trim() || 'Team 1';
            const t2 = teams[1]?.trim() || 'Team 2';

            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.onclick = () => window.location.href = `event.html?id=${m.id}`;
            
            row.innerHTML = `
                <div class="timeline-left">
                    <span class="date-val">${dVal}</span>
                    <span class="month-val">${mVal}</span>
                    <span class="day-val">${dayStr}</span>
                    <span class="city-val">${city}</span>
                </div>
                <div class="timeline-right">
                    <div class="match-label">Match ${index + 1}</div>
                    <div class="teams-vs-ui">
                        <div class="team-ui"><img src="${m.team1Logo}" alt="${t1}"><span>${t1}</span></div>
                        <div class="vs-circle">VS</div>
                        <div class="team-ui"><img src="${m.team2Logo}" alt="${t2}"><span>${t2}</span></div>
                    </div>
                    <div class="venue-time">${formatTime(m.time)} | ${stadiumName} : ${city}</div>
                    <div class="action-link">Fast Filling. Book Now &gt;</div>
                </div>
            `;
            matchList.appendChild(row);
        });
    };

    onValue(ref(db, 'matches'), (snapshot) => {
        matchesData =[];
        snapshot.forEach(child => matchesData.push({ id: child.key, ...child.val() }));
        renderMatches();
    });

    sortFilter.addEventListener('change', renderMatches);
}

// ---------------------------------------------
// 2. EVENT PAGE
// ---------------------------------------------
if (document.getElementById('event-container')) {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');
    const container = document.getElementById('event-container');
    const priceNode = document.getElementById('event-price');
    const bookBtn = document.getElementById('book-now-btn');
    const footerBar = document.getElementById('event-footer');
    
    // Modal logic
    const tncModal = document.getElementById('tnc-modal');
    const acceptTncBtn = document.getElementById('accept-tnc-btn');

    if(!matchId) window.location.href = 'index.html';

    onValue(ref(db, `matches/${matchId}`), (snapshot) => {
        const m = snapshot.val();
        if(!m) { container.innerHTML = '<div class="loading">Match not found.</div>'; return; }
        
        priceNode.innerText = `₹${m.price} onwards`;
        footerBar.style.display = 'flex';
        
        container.innerHTML = `
            <div class="hero-section" style="margin-bottom:0; padding:0;">
                <img src="${m.banner}" class="hero-banner" style="border-radius:0;">
                <div class="tag-badge">Cricket</div>
            </div>
            
            <div style="padding: 16px; background:#fff;">
                <div class="interest-left" style="margin-bottom: 16px;">
                    <span class="thumb-icon">👍</span>
                    <div>
                        <strong>71.7k are interested</strong>
                        <p style="font-size:11px;">Mark interested to know more about this event.</p>
                    </div>
                </div>
            </div>
            
            <div class="event-details-list bg-white" style="background:#fff;">
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>${formatDateFull(m.date)}</span>
                </div>
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>${formatTime(m.time)}</span>
                </div>
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    <span>5 Hours</span>
                </div>
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Age Limit - 2yrs +</span>
                </div>
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <span>Hindi, English</span>
                </div>
                <div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${m.venue}</span>
                </div>
            </div>

            <div class="explore-banner">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;">📣</span> EXPLORE THE TOURNAMENT HOMEPAGE
                </div>
                <span>&gt;</span>
            </div>

            <div class="limit-info-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Ticket limit for this booking is 10
            </div>

            <div class="about-section bg-white" style="background:#fff;">
                <h3>About The Event</h3>
                <p>Witness an exciting showdown in the TATA IPL 2026 as the ${m.title} battle in a thrilling match. Known for their explosive gameplay, this event promises pure entertainment... <span class="read-more">Read More</span></p>
            </div>

            <div class="tnc-link bg-white" style="background:#fff;" onclick="document.getElementById('tnc-modal').classList.add('active')">
                <span>Terms & Conditions</span>
                <span>&gt;</span>
            </div>
            
            <div class="breadcrumbs" style="background:#f4f4f5; border:none;">
                Home ➞ Sports ➞ Cricket ➞ ${m.title}
            </div>
        `;

        bookBtn.onclick = () => {
            tncModal.classList.add('active'); 
        };
        
        acceptTncBtn.onclick = () => {
            localStorage.setItem('booking_matchId', matchId);
            localStorage.setItem('booking_price', m.price);
            localStorage.setItem('booking_title', m.title);
            if(window.fbq) fbq('track', 'InitiateCheckout');
            window.location.href = 'seats.html';
        };
    });
}

// ---------------------------------------------
// 3. SEATS PAGE
// ---------------------------------------------
if (document.getElementById('qty-bubbles')) {
    const matchId = localStorage.getItem('booking_matchId');
    const matchPrice = parseInt(localStorage.getItem('booking_price') || 0);
    const matchTitle = localStorage.getItem('booking_title') || 'Select Seats';
    
    if(!matchId) window.location.href = 'index.html';

    document.getElementById('seat-match-title').innerText = matchTitle;

    const qtyView = document.getElementById('qty-view');
    const seatView = document.getElementById('seat-view');
    const proceedToSeatsBtn = document.getElementById('proceed-to-seats');
    
    let allowedQty = 1; 

    const bubbleContainer = document.getElementById('qty-bubbles');
    for(let i=1; i<=10; i++){
        let b = document.createElement('div');
        b.className = 'qty-bubble ' + (i===1 ? 'active' : '');
        b.innerText = i;
        b.onclick = () => {
            document.querySelectorAll('.qty-bubble').forEach(el => el.classList.remove('active'));
            b.classList.add('active');
            allowedQty = i;
        };
        bubbleContainer.appendChild(b);
    }

    proceedToSeatsBtn.onclick = () => {
        qtyView.style.display = 'none';
        seatView.style.display = 'block';
        initSeatMap();
    };

    const initSeatMap = () => {
        const seatMap = document.getElementById('seat-map');
        const checkoutBar = document.getElementById('checkout-bar');
        const countLabel = document.getElementById('seat-count-label');
        const totalPriceLabel = document.getElementById('total-price');
        const payBtn = document.getElementById('pay-now-btn');
        const LOCK_EXPIRY = 4 * 60 * 1000; 

        let selectedSeatsCount = 0;
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
                    if (seatInfo.status === 'booked') status = 'booked';
                    else if (seatInfo.status === 'locked') {
                        if (Date.now() - seatInfo.timestamp < LOCK_EXPIRY) {
                            status = (seatInfo.user === sessionId) ? 'self-locked' : 'locked';
                        } else { status = 'available'; }
                    }
                }

                if (status === 'booked' || status === 'locked') {
                    seatNode.classList.add('booked');
                } else if (status === 'self-locked') {
                    seatNode.classList.add('locked');
                    selectedSeatsCount++;
                    seatNode.onclick = () => toggleSeat(seatId, 'unlock');
                } else {
                    seatNode.classList.add('available');
                    seatNode.onclick = () => toggleSeat(seatId, 'lock');
                }
                seatMap.appendChild(seatNode);
            }
            updateCheckoutBar();
        };

        const toggleSeat = (seatId, action) => {
            if (action === 'lock' && selectedSeatsCount >= allowedQty) {
                alert(`You can only select ${allowedQty} seat(s) as per your choice.`);
                return;
            }
            const updates = {};
            if (action === 'lock') {
                updates[`seats/${matchId}/${seatId}`] = { status: 'locked', user: sessionId, timestamp: Date.now() };
                const currentTotal = (selectedSeatsCount + 1) * matchPrice;
                if(window.fbq) fbq('track', 'AddToCart', { value: currentTotal, currency: 'INR' });
            } else {
                updates[`seats/${matchId}/${seatId}`] = null;
            }
            update(ref(db), updates);
        };

        const updateCheckoutBar = () => {
            if (selectedSeatsCount > 0) {
                checkoutBar.style.display = 'flex';
                countLabel.innerText = `${selectedSeatsCount} Ticket(s)`;
                totalPriceLabel.innerText = `₹${selectedSeatsCount * matchPrice}`;
            } else {
                checkoutBar.style.display = 'none';
            }
        };

        onValue(ref(db, `seats/${matchId}`), (snapshot) => renderSeats(snapshot.val()));

        payBtn.onclick = () => {
            if(selectedSeatsCount !== allowedQty) {
                alert(`Please select exactly ${allowedQty} seat(s) before paying.`);
                return;
            }
            const amount = selectedSeatsCount * matchPrice;
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
                    updates[`bookings/${bookingRef.key}`] = { matchId, userId: sessionId, seats: mySeats, amount, timestamp: Date.now() };
                    update(ref(db), updates).then(() => {
                        if(window.fbq) fbq('track', 'Purchase', { value: amount, currency: 'INR' });
                        document.getElementById('success-modal').classList.add('active');
                    });
                }
            });
        };
        
        setInterval(() => { get(ref(db, `seats/${matchId}`)).then(snap => renderSeats(snap.val())); }, 30000); 
    };
}
