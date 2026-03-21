import { db, ref, onValue, set, remove, push } from './firebase.js';

if (document.getElementById('match-form')) {
    const form = document.getElementById('match-form');
    const tableBody = document.getElementById('admin-match-list');
    
    const editIdInput = document.getElementById('edit-id');
    const mTitle = document.getElementById('m-title');
    const mDate = document.getElementById('m-date');
    const mTime = document.getElementById('m-time');
    const mVenue = document.getElementById('m-venue');
    const mPrice = document.getElementById('m-price');
    const mTeam1 = document.getElementById('m-team1'); // Direct URL Input
    const mTeam2 = document.getElementById('m-team2'); // Direct URL Input
    const mBanner = document.getElementById('m-banner'); // Direct URL Input
    
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');

    let isEditing = false;
    let currentMatchData = null;

    // Load Matches in Table
    onValue(ref(db, 'matches'), (snapshot) => {
        tableBody.innerHTML = '';
        const matches =
